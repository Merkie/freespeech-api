import type { NextFunction, Request, Response } from 'express';
import { getClientIp } from './client-ip';

// Fixed-window counters kept in memory. The API is a single process, so this is enough; counters
// reset on restart.
type Window = { count: number; resetAt: number };

const limiters: RateLimiter[] = [];

export class RateLimiter {
	private windows = new Map<string, Window>();

	constructor(
		readonly limit: number,
		readonly windowMs: number
	) {
		limiters.push(this);
	}

	private current(key: string) {
		const window = this.windows.get(key);
		if (!window || window.resetAt <= Date.now()) return null;
		return window;
	}

	/** Seconds until `key` may try again, or 0 when it is under the limit. */
	retryAfter(key: string) {
		const window = this.current(key);
		if (!window || window.count < this.limit) return 0;
		return Math.max(1, Math.ceil((window.resetAt - Date.now()) / 1000));
	}

	hit(key: string) {
		const window = this.current(key);
		if (window) window.count += 1;
		else this.windows.set(key, { count: 1, resetAt: Date.now() + this.windowMs });
	}

	/** Counts this attempt and returns the retry delay if it went over the limit. */
	consume(key: string) {
		const retryAfter = this.retryAfter(key);
		if (retryAfter) return retryAfter;
		this.hit(key);
		return 0;
	}

	reset(key: string) {
		this.windows.delete(key);
	}

	sweep() {
		const now = Date.now();
		for (const [key, window] of this.windows) {
			if (window.resetAt <= now) this.windows.delete(key);
		}
	}
}

setInterval(() => limiters.forEach((limiter) => limiter.sweep()), 5 * 60 * 1000).unref();

export function sendTooManyRequests(res: Response, retryAfterSeconds: number, message: string) {
	const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
	res.setHeader('Retry-After', String(retryAfterSeconds));
	return res.status(429).json({
		error: `${message} Please try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`
	});
}

/** Middleware that counts every request from the caller's IP against `limiter`. */
export function limitByIp(limiter: RateLimiter, message: string) {
	return (req: Request, res: Response, next: NextFunction) => {
		const retryAfter = limiter.consume(getClientIp(req));
		if (retryAfter) return sendTooManyRequests(res, retryAfter, message);
		next();
	};
}

export function emailKey(email: string) {
	return email.trim().toLowerCase();
}
