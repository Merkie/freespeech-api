import { authenticateRequest } from '@/middleware/authenticate-request';
import { validateSchema } from '@/middleware/validate-schema';
import { cache } from '@/resources/cache';
import prisma from '@/resources/prisma';
import type { Request, Response } from 'express';
import { z } from 'zod';

const schema = z.object({
	pageId: z.string()
});

export const POST = [
	authenticateRequest(),
	validateSchema(schema),
	async (req: Request, res: Response) => {
		const body = req.body as z.infer<typeof schema>;

		const startTime = Date.now();
		const page = await cache(
			prisma.tilePageInProject.findFirst({
				where: {
					project: {
						userId: req.userId,
						id: req.params.id
					},
					tilePageId: body.pageId
				},
				include: {
					tilePage: {
						include: {
							tiles: true
						}
					},
					project: true
				}
			}),
			{
				key: `page:${body.pageId}:${req.userId}`,
				ttl: '60s'
			}
		);
		const duration = Date.now() - startTime;
		console.log(`[view-page-in-project] Page fetched in ${duration}ms (pageId: ${body.pageId})`);

		if (!page) return res.status(404).json({ error: 'Page not found' });

		return res.json({ page, isHomePage: page.tilePageId === page.project.homePageId });
	}
];
