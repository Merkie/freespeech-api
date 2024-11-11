import { authenticateRequest } from '@/middleware/authenticate-request';
import { invalidateCache } from '@/resources/cache';
import prisma from '@/resources/prisma';
import type { Request, Response } from 'express';

export const DELETE = [
	authenticateRequest(),
	async (req: Request, res: Response) => {
		const [tilePage, _] = await Promise.all([
			prisma.tilePage.findFirst({
				where: {
					id: req.params.id,
					userId: req.userId
				}
			}),
			prisma.tile.delete({
				where: {
					id: req.params.id,
					TilePage: {
						userId: req.userId
					}
				}
			})
		]);

		invalidateCache(`page:${tilePage}:${req.userId}`);

		return res.json({ success: true });
	}
];
