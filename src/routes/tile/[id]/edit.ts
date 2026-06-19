import { authenticateRequest } from '@/middleware/authenticate-request';
import { validateSchema } from '@/middleware/validate-schema';
import { invalidateCache } from '@/resources/cache';
import prisma from '@/resources/prisma';
import type { Request, Response } from 'express';
import { z } from 'zod';

const schema = z.object({
	x: z.number().optional(),
	y: z.number().optional(),
	page: z.number().optional(),
	tilePageId: z.string().optional(),
	text: z.string().optional(),
	backgroundColor: z.string().optional(),
	borderColor: z.string().optional(),
	image: z.string().optional(),
	navigation: z.string().optional(),
	displayText: z.string().optional()
});

export const POST = [
	authenticateRequest(),
	validateSchema(schema),
	async (req: Request, res: Response) => {
		const body = req.body as z.infer<typeof schema>;

		const existingTile = await prisma.tile.findFirst({
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

		if (!existingTile) return res.json({ error: 'The tile does not exist.' });

		// When moving a tile to a different page (e.g. dropping it into a folder),
		// make sure the destination page belongs to the same user.
		const movingToNewPage = !!body.tilePageId && body.tilePageId !== existingTile.tilePageId;
		if (movingToNewPage) {
			const targetPage = await prisma.tilePage.findFirst({
				where: {
					id: body.tilePageId,
					userId: req.userId
				}
			});

			if (!targetPage) return res.json({ error: 'The destination page does not exist.' });
		}

		await prisma.tile.update({
			where: {
				id: req.params.id,
				TilePage: {
					userId: req.userId
				}
			},
			data: body
		});

		invalidateCache(`page:${existingTile.tilePageId}:${req.userId}`);
		if (movingToNewPage) invalidateCache(`page:${body.tilePageId}:${req.userId}`);

		return res.json({ success: true });
	}
];
