import { authenticateRequest } from '@/middleware/authenticate-request';
import prisma from '@/resources/prisma';
import type { Request, Response } from 'express';

export const GET = [
	authenticateRequest(),
	async (req: Request, res: Response) => {
		const startTime = Date.now();

		const pages = await prisma.tilePageInProject.findMany({
			where: {
				project: {
					id: req.params.id,
					userId: req.userId
				}
			},
			include: {
				tilePage: true
			},
			orderBy: {
				tilePage: {
					updatedAt: 'desc'
				}
			}
		});

		const duration = Date.now() - startTime;
		console.log(`[project/pages] Pages fetched in ${duration}ms (projectId: ${req.params.id})`);

		if (!pages) {
			return res.status(404).json({ error: 'Project not found' });
		}

		return res.json({ pages: pages.map((p) => p.tilePage) });
	}
];
