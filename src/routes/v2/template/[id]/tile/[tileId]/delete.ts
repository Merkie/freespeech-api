import type { Request, Response } from 'express';
import { authenticateRequest } from '@/middleware/authenticate-request';
import prisma from '@/resources/prisma';

export const DELETE = [
	authenticateRequest(),
	async (req: Request, res: Response) => {
		const tile = await prisma.templateTile.findFirst({
			where: {
				id: req.params.tileId,
				templateId: req.params.id,
				template: {
					userId: req.userId,
				},
			},
		});

		if (!tile) {
			return res.status(404).json({ error: 'Template tile not found.' });
		}

		await prisma.templateTile.delete({
			where: { id: req.params.tileId },
		});

		return res.json({ success: true });
	},
];
