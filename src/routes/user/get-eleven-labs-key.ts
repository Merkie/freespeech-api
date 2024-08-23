import { authenticateRequest } from '@/middleware/authenticate-request';
import prisma from '@/resources/prisma';
import type { Request, Response } from 'express';
import { DecryptElevenLabsKey } from '@/utils/decrypt-key';

export const GET = [
	authenticateRequest(),
	async (req: Request, res: Response) => {
		const user = await prisma.user.findUnique({
			where: {
				id: req.userId
			}
		});
		if (!user) return res.json({ error: 'User not found' });

		return res.json({ key: DecryptElevenLabsKey(user?.elevenLabsApiKey) + '' });
	}
];
