import { authenticateRequest } from '@/middleware/authenticate-request';
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

		return res.json({
			message: 'Page deleted successfully.'
		});
	}
];
