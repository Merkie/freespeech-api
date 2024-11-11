import { z } from 'zod';
import type { Request, Response } from 'express';
import { validateSchema } from '@/middleware/validate-schema';
import { authenticateRequest } from '@/middleware/authenticate-request';
import prisma from '@/resources/prisma';
import { invalidateCache } from '@/resources/cache';

const schema = z.object({
	x: z.number(),
	y: z.number(),
	page: z.number(),
	pageId: z.string()
});

export const POST = [
	authenticateRequest(),
	validateSchema(schema),
	async (req: Request, res: Response) => {
		const body = req.body as z.infer<typeof schema>;

		// Get the page
		const page = await prisma.tilePage.findUnique({
			where: {
				id: body.pageId,
				userId: req.userId
			},
			include: {
				tiles: true
			}
		});

		// Check if the page exists
		if (!page) return res.json({ error: 'The page does not exist.' });

		// Check if there is a tile in the same location
		if (
			page.tiles.find((tile) => tile.x === body.x && tile.y === body.y && tile.page === body.page)
		)
			return res.json({ error: 'A tile already exists in this location.' });

		const tile = await prisma.tile.create({
			data: {
				x: body.x,
				y: body.y,
				page: body.page,
				tilePageId: body.pageId
			}
		});

		invalidateCache(`page:${page.id}:${req.userId}`);

		return res.json({ tile });
	}
];
