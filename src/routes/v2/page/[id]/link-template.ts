import type { Request, Response } from 'express';
import { z } from 'zod';
import { authenticateRequest } from '@/middleware/authenticate-request';
import { validateSchema } from '@/middleware/validate-schema';
import prisma from '@/resources/prisma';
import { invalidateCache } from '@/resources/cache';

const schema = z.object({
	templatePageId: z.string(),
});

export const POST = [
	authenticateRequest(),
	validateSchema(schema),
	async (req: Request, res: Response) => {
		const body = req.body as z.infer<typeof schema>;

		// Verify page exists and belongs to user
		const page = await prisma.tilePage.findFirst({
			where: {
				id: req.params.id,
				userId: req.userId,
				isTemplate: false,
			},
		});

		if (!page) {
			return res.status(404).json({ error: 'Page not found.' });
		}

		// Verify template page exists, belongs to user, and is a template
		const templatePage = await prisma.tilePage.findFirst({
			where: {
				id: body.templatePageId,
				userId: req.userId,
				isTemplate: true,
			},
			include: {
				tiles: true,
				connectedProjects: {
					include: {
						project: {
							select: {
								id: true,
								name: true,
								columns: true,
								rows: true,
							},
						},
					},
				},
			},
		});

		if (!templatePage) {
			return res.status(404).json({ error: 'Template not found.' });
		}

		// Upsert the link (replace existing if one exists)
		const link = await prisma.pageTemplateLink.upsert({
			where: { tilePageId: req.params.id },
			create: {
				tilePageId: req.params.id,
				templatePageId: body.templatePageId,
			},
			update: {
				templatePageId: body.templatePageId,
			},
			include: {
				templatePage: {
					include: {
						tiles: true,
						connectedProjects: {
							include: {
								project: {
									select: {
										id: true,
										name: true,
										columns: true,
										rows: true,
									},
								},
							},
						},
					},
				},
			},
		});

		invalidateCache(`page:${req.params.id}:${req.userId}`);

		return res.json({
			link,
			template: {
				...link.templatePage,
				project: link.templatePage.connectedProjects[0]?.project || null,
			},
		});
	},
];
