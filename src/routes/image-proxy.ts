import type { Request, Response } from 'express';
import { RateLimiter, limitByIp } from '@/utils/rate-limit';
import { SafeFetchError, safeFetch } from '@/utils/safe-fetch';

// Unauthenticated, so it is limited to public addresses (see safeFetch), image responses, a size
// cap and a generous per-IP rate.
const proxyLimiter = new RateLimiter(600, 15 * 60 * 1000);

export const GET = [
	limitByIp(proxyLimiter, 'Too many image requests.'),
	async (req: Request, res: Response) => {
		try {
			const imageUrl = req.query.url;

			if (!imageUrl || typeof imageUrl !== 'string') {
				return res.status(400).json({
					success: false,
					error: "Missing 'url' query parameter"
				});
			}

			const response = await safeFetch(imageUrl, {
				maxBytes: 10 * 1024 * 1024,
				timeoutMs: 10000,
				headers: {
					'User-Agent': 'FreeSpeech-ImageProxy/1.0',
					Accept: 'image/*'
				}
			});

			if (response.status < 200 || response.status >= 300) {
				return res.status(response.status >= 400 ? response.status : 502).json({
					success: false,
					error: `Failed to fetch image: ${response.statusText}`
				});
			}

			const contentType = response.contentType;

			// Validate it's an image
			if (!contentType.startsWith('image/')) {
				return res.status(400).json({
					success: false,
					error: 'URL does not point to an image'
				});
			}

			res.setHeader('Content-Type', contentType);
			res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
			res.setHeader('Access-Control-Allow-Origin', '*');
			res.setHeader('X-Content-Type-Options', 'nosniff');
			// SVGs can carry script; never let a proxied file run in this origin.
			res.setHeader(
				'Content-Security-Policy',
				"default-src 'none'; style-src 'unsafe-inline'; sandbox"
			);

			return res.send(response.body);
		} catch (error) {
			if (error instanceof SafeFetchError) {
				return res.status(error.status).json({ success: false, error: error.message });
			}
			console.error('Error proxying image:', error);
			return res.status(500).json({
				success: false,
				error: 'An unknown error occurred'
			});
		}
	}
];
