import { authenticateRequest } from '@/middleware/authenticate-request';
import { cache } from '@/resources/cache';
import prisma from '@/resources/prisma';
import type { Request, Response } from 'express';

export const GET = [
	authenticateRequest(),
	async (req: Request, res: Response) => {
		let user = await cache(
			prisma.user.findUnique({
				where: {
					id: req.userId
				}
			}),
			{ key: `user:${req.userId}`, ttl: '30s' }
		);
		if (!user) return res.status(404).json({ error: 'User not found' });

		if (user?.password) {
			user.password = 'redacted';
		}

		res.json({ user });
	}
];
