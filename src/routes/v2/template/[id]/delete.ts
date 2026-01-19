import type { Request, Response } from 'express';
import { authenticateRequest } from '@/middleware/authenticate-request';
import prisma from '@/resources/prisma';

export const DELETE = [
	authenticateRequest(),
	async (req: Request, res: Response) => {
		const existing = await prisma.tilePage.findFirst({
			where: {
				id: req.params.id,
				userId: req.userId,
				isTemplate: true,
			},
		});

		if (!existing) {
			return res.status(404).json({ error: 'Template not found.' });
		}

		await prisma.tilePage.delete({
			where: { id: req.params.id },
		});

		return res.json({ success: true });
	},
];
