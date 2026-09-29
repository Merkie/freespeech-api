import type { Request, Response } from 'express';
import { validateSchema } from '@/middleware/validate-schema';
import prisma from '@/resources/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { generateToken } from '@/utils/token';
import { emailKey, limitByIp, sendTooManyRequests } from '@/utils/rate-limit';
import { loginFailureLimiter, loginIpLimiter } from '@/utils/auth-limits';

const schema = z.object({
	email: z.string().email(),
	password: z.string()
});

export const POST = [
	limitByIp(loginIpLimiter, 'Too many sign-in attempts from your network.'),
	validateSchema(schema),
	async (req: Request, res: Response) => {
		const body = req.body as z.infer<typeof schema>;

		// Checked before the password so a locked account cannot be guessed at even with the right one.
		const accountKey = emailKey(body.email);
		const retryAfter = loginFailureLimiter.retryAfter(accountKey);
		if (retryAfter) {
			return sendTooManyRequests(
				res,
				retryAfter,
				'Too many failed sign-in attempts for this account.'
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
		const doPasswordsMatch = !!user?.password && bcrypt.compareSync(body.password, user.password);
		if (!user || !doPasswordsMatch) {
			loginFailureLimiter.hit(accountKey);
			return res.status(401).json({ error: 'Invalid email or password' });
		}

		loginFailureLimiter.reset(accountKey);

		const { token } = generateToken(user.id);

		return res.json({ token });
	}
];
