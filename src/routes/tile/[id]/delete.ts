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
					userId: req.userId,
					tiles: {
						some: {
							id: req.params.id
						}
					}
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

		if (!tilePage) return res.json({ error: 'The tile does not exist.' });

		invalidateCache(`page:${tilePage.id}:${req.userId}`);

		return res.json({ success: true });
	}
];
