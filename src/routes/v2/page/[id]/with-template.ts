import type { Request, Response } from 'express';
import { authenticateRequest } from '@/middleware/authenticate-request';
import prisma from '@/resources/prisma';
import { addOptimizedImageUrlsToTiles } from '@/utils/image-url';

export const GET = [
	authenticateRequest(),
	async (req: Request, res: Response) => {
		// Get page with tiles and template link
		const page = await prisma.tilePage.findFirst({
			where: {
				id: req.params.id,
				userId: req.userId,
			},
			include: {
				tiles: true,
				templateLink: {
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
				},
			},
		});

		if (!page) {
			return res.status(404).json({ error: 'Page not found.' });
		}

		// Extract template data if linked
		const templatePage = page.templateLink?.templatePage || null;
		const templateTiles = templatePage?.tiles || [];

		// Add optimized image URLs to tiles
		const optimizedPageTiles = addOptimizedImageUrlsToTiles(page.tiles);
		const optimizedTemplateTiles = addOptimizedImageUrlsToTiles(templateTiles);

		return res.json({
			page: {
				id: page.id,
				name: page.name,
				tiles: optimizedPageTiles,
				isPublic: page.isPublic,
				isTemplate: page.isTemplate,
				userId: page.userId,
				createdAt: page.createdAt,
				updatedAt: page.updatedAt,
			},
			template: templatePage
				? {
						...templatePage,
						project: templatePage.connectedProjects[0]?.project || null,
				  }
				: null,
			templateTiles: optimizedTemplateTiles,
		});
	},
];
