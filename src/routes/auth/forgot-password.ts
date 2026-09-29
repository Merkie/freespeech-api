import type { Request, Response } from 'express';
import { validateSchema } from '@/middleware/validate-schema';
import prisma from '@/resources/prisma';
import { z } from 'zod';
import { generatePasswordResetToken } from '@/utils/token';
import { sendPasswordResetEmail } from '@/resources/email';
import { CLIENT_HOST } from '@/utils/env';
import { emailKey, limitByIp, sendTooManyRequests } from '@/utils/rate-limit';
import { forgotPasswordEmailLimiter, forgotPasswordIpLimiter } from '@/utils/auth-limits';

const schema = z.object({
	email: z.string().email()
});

export const POST = [
	limitByIp(forgotPasswordIpLimiter, 'Too many password reset requests from your network.'),
	validateSchema(schema),
	async (req: Request, res: Response) => {
		const body = req.body as z.infer<typeof schema>;

		// Counted whether or not the account exists, so the limit reveals nothing about registration.
		const retryAfter = forgotPasswordEmailLimiter.consume(emailKey(body.email));
		if (retryAfter) {
			return sendTooManyRequests(
				res,
				retryAfter,
				'Too many password reset requests for this email.'
			);
		}

		const user = await prisma.user.findFirst({
			where: {
				email: {
					equals: body.email,
					mode: 'insensitive'
				}
			}
		});

		// Only send if the account exists AND has a password. OAuth-only accounts
		// (Google) have no password to reset.
		if (user && user.password) {
			const token = generatePasswordResetToken(user.id, user.password);
			const resetUrl = `${CLIENT_HOST}/login/reset-password?token=${encodeURIComponent(token)}`;
			try {
				await sendPasswordResetEmail(user.email, resetUrl);
			} catch (e) {
				console.error('Failed to send password reset email:', e);
			}
		}

		// Always respond identically so we don't leak which emails are registered.
		return res.json({ success: true });
	}
];
