import { authenticateRequest } from '@/middleware/authenticate-request';
import { invalidateCache } from '@/resources/cache';

import prisma from '@/resources/prisma';
import type { Request, Response } from 'express';

export const DELETE = [
	authenticateRequest(),
	async (req: Request, res: Response) => {
		const tilePage = await prisma.tile.findFirst({
			where: {
				id: req.params.id,
				TilePage: {
					userId: req.userId
				}
			},
			include: {
				TilePage: true
			}
		});

		if (!tilePage) return res.json({ error: 'The tile does not exist.' });

		await prisma.tile.delete({
			where: {
				id: req.params.id,
				TilePage: {
					userId: req.userId
				}
			}
		});

		invalidateCache(`page:${tilePage.tilePageId}:${req.userId}`);

		return res.json({ success: true });
	}
];
