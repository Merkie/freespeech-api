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
			prisma.tile.update({
				where: {
					id: req.params.id,
					TilePage: {
						userId: req.userId
					}
				},
				data: body
			})
		]);

		if (!tilePage) return res.json({ error: 'The tile does not exist.' });

		invalidateCache(`page:${tilePage.id}:${req.userId}`);

		return res.json({ success: true });
	}
];
