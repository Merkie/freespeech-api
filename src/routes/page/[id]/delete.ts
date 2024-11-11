import { authenticateRequest } from '@/middleware/authenticate-request';
import { invalidateCache } from '@/resources/cache';
import prisma from '@/resources/prisma';
import type { Request, Response } from 'express';

export const DELETE = [
	authenticateRequest(),
	async (req: Request, res: Response) => {
		await prisma.tilePage.delete({
			where: {
				userId: req.userId,
				id: req.params.id as string
			}
		});

		invalidateCache(`page:${req.params.id}:${req.userId}`);
		invalidateCache(`project:${req.params.id}:${req.userId}`);

		return res.json({
			message: 'Page deleted successfully.'
		});
	}
];
