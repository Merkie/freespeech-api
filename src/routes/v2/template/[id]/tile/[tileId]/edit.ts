import type { Request, Response } from 'express';
import { z } from 'zod';
import { authenticateRequest } from '@/middleware/authenticate-request';
import { validateSchema } from '@/middleware/validate-schema';
import prisma from '@/resources/prisma';

const schema = z.object({
	x: z.number().optional(),
	y: z.number().optional(),
	text: z.string().optional(),
	backgroundColor: z.string().optional(),
	borderColor: z.string().optional(),
	image: z.string().optional(),
	navigation: z.string().optional(),
	displayText: z.string().optional(),
});

export const POST = [
	authenticateRequest(),
	validateSchema(schema),
	async (req: Request, res: Response) => {
		const body = req.body as z.infer<typeof schema>;

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

		const updatedTile = await prisma.templateTile.update({
			where: { id: req.params.tileId },
			data: body,
		});

		return res.json({ tile: updatedTile });
	},
];
