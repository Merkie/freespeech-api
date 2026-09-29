import { authenticateRequest } from '@/middleware/authenticate-request';
import prisma from '@/resources/prisma';
import { absoluteMediaUrl } from '@/utils/user-media';
import type { Tile, TilePage } from '@prisma/client';
import type { Request, Response } from 'express';

// "Download my data": the caller's account and every board they own, as one JSON file. Never
// includes the password hash or the ElevenLabs key, only whether they are set.
export const GET = [
	authenticateRequest(),
	async (req: Request, res: Response) => {
		const user = await prisma.user.findUnique({ where: { id: req.userId } });
		if (!user) return res.status(404).json({ error: 'User not found' });

		const [projects, pagesOutsideProjects] = await Promise.all([
			prisma.project.findMany({
				where: { userId: user.id },
				orderBy: { createdAt: 'asc' },
				include: {
					connectedPages: {
						include: {
							tilePage: { include: { tiles: true, templateLink: true } }
						}
					}
				}
			}),
			prisma.tilePage.findMany({
				where: { userId: user.id, connectedProjects: { none: {} } },
				orderBy: { createdAt: 'asc' },
				include: { tiles: true, templateLink: true }
			})
		]);

		const pageNames = new Map<string, string>();
		for (const project of projects) {
			for (const { tilePage } of project.connectedPages) pageNames.set(tilePage.id, tilePage.name);
		}
		for (const page of pagesOutsideProjects) pageNames.set(page.id, page.name);

		const formatTile = (tile: Tile) => ({
			text: tile.text,
			displayText: tile.displayText,
			imageUrl: absoluteMediaUrl(tile.image) || null,
			subpage: tile.page,
			column: tile.x,
			row: tile.y,
			backgroundColor: tile.backgroundColor,
			borderColor: tile.borderColor,
			opensPageId: tile.navigation || null,
			opensPageName: (tile.navigation && pageNames.get(tile.navigation)) || null,
			createdAt: tile.createdAt,
			updatedAt: tile.updatedAt
		});

		const formatPage = (
			page: TilePage & { tiles: Tile[]; templateLink: { templatePageId: string } | null },
			homePageId?: string | null
		) => ({
			id: page.id,
			name: page.name,
			isHomePage: page.id === homePageId,
			isTemplate: page.isTemplate,
			templatePageId: page.templateLink?.templatePageId || null,
			createdAt: page.createdAt,
			updatedAt: page.updatedAt,
			tiles: [...page.tiles]
				.sort((a, b) => a.page - b.page || a.y - b.y || a.x - b.x)
				.map(formatTile)
		});

		const data = {
			exportedAt: new Date().toISOString(),
			account: {
				id: user.id,
				email: user.email,
				name: user.name,
				createdAt: user.createdAt,
				updatedAt: user.updatedAt,
				profileImageUrl: absoluteMediaUrl(user.profileImgUrl),
				hasPassword: !!user.password,
				personalElevenLabsKeySaved: !!user.elevenLabsApiKey,
				usePersonalElevenLabsKey: user.usePersonalElevenLabsKey
			},
			projects: projects.map((project) => ({
				id: project.id,
				name: project.name,
				description: project.description,
				columns: project.columns,
				rows: project.rows,
				thumbnailUrl: absoluteMediaUrl(project.imageUrl),
				createdAt: project.createdAt,
				updatedAt: project.updatedAt,
				pages: project.connectedPages
					.map(({ tilePage }) => tilePage)
					.sort(
						(a, b) =>
							Number(b.id === project.homePageId) - Number(a.id === project.homePageId) ||
							a.name.localeCompare(b.name)
					)
					.map((page) => formatPage(page, project.homePageId))
			})),
			pagesNotInAProject: pagesOutsideProjects.map((page) => formatPage(page))
		};

		const date = new Date().toISOString().slice(0, 10);
		res.setHeader('Cache-Control', 'no-store');
		res.setHeader('Content-Disposition', `attachment; filename="freespeech-data-${date}.json"`);
		res.type('application/json').send(JSON.stringify(data, null, 2));
	}
];
