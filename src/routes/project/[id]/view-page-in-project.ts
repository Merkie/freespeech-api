import { authenticateRequest } from '@/middleware/authenticate-request';
import { validateSchema } from '@/middleware/validate-schema';
import { cache } from '@/resources/cache';
import prisma from '@/resources/prisma';
import { GetProjectHomePageID } from '@/utils/get-project-home-page-id';
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
					project: {
						include: {
							connectedPages: {
								include: {
									tilePage: true
								},
								orderBy: {
									tilePage: {
										updatedAt: 'desc'
									}
								}
							}
						}
					}
				}
			}),
			{
				key: `page:${body.pageId}:${req.userId}`,
				ttl: '60s'
			}
		);

		if (!page) return res.status(404).json({ error: 'Page not found' });

		const projectHomePageId = await GetProjectHomePageID(page.project);

		return res.json({ page, isHomePage: page.tilePageId === projectHomePageId });
	}
];
