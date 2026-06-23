import { authenticateRequest } from '@/middleware/authenticate-request';
import prisma from '@/resources/prisma';
import type { Request, Response } from 'express';

export const GET = [
	authenticateRequest(),
	async (req: Request, res: Response) => {
		let project = await prisma.project.findFirst({
			where: {
				id: req.params.id,
				userId: req.userId
			},
			include: {
				connectedPages: {
					include: {
						tilePage: true
					}
				}
			}
		});

		if (!project) {
			return res.status(404).json({ error: 'Project not found' });
		}

		// Backfill homePageId if missing
		if (!project.homePageId && project.connectedPages.length > 0) {
			const homePage = project.connectedPages.find(
				(cp) => cp.tilePage.name.toLowerCase().trim() === 'home'
			);
			const homePageId = homePage?.tilePageId || project.connectedPages[0]?.tilePageId;

			if (homePageId) {
				await prisma.project.update({
					where: { id: project.id },
					data: { homePageId }
				});
				project = { ...project, homePageId };
				console.log(`[project/view] Backfilled homePageId for project ${project.id}`);
			}
		}

		return res.json({ project });
	}
];
