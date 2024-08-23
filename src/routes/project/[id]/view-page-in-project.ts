import { authenticateRequest } from '@/middleware/authenticate-request';
import { validateSchema } from '@/middleware/validate-schema';
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

		const page = await prisma.tilePageInProject.findFirst({
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
		});

		if (!page) return res.status(404).json({ error: 'Page not found' });

		return res.json({ page });
	}
];
