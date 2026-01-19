import type { Request, Response } from 'express';
import { authenticateRequest } from '@/middleware/authenticate-request';
import prisma from '@/resources/prisma';

export const GET = [
	authenticateRequest(),
	async (req: Request, res: Response) => {
		const projectId = req.query.projectId as string | undefined;

		// Get template pages - either for a specific project or all user's templates
		const templates = await prisma.tilePage.findMany({
			where: {
				userId: req.userId,
				isTemplate: true,
				...(projectId && {
					connectedProjects: {
						some: { projectId },
					},
				}),
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
				pagesUsingAsTemplate: true,
			},
			orderBy: { updatedAt: 'desc' },
		});

		// Transform to include project info and linked pages count
		const templatesWithInfo = templates.map((template) => ({
			...template,
			project: template.connectedProjects[0]?.project || null,
			_count: { linkedPages: template.pagesUsingAsTemplate.length },
		}));

		return res.json({ templates: templatesWithInfo });
	},
];
