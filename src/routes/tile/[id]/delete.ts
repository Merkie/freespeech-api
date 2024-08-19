import { authenticateRequest } from '@/middleware/authenticate-request';
import prisma from '@/resources/prisma';
import type { Request, Response } from 'express';

export const DELETE = [
	authenticateRequest(),
	async (req: Request, res: Response) => {
		await prisma.tile.delete({
			where: {
				id: req.params.id,
				TilePage: {
					userId: req.userId
				}
			}
		});

		return res.json({ success: true });
	}
];
