import { authenticateRequest } from '@/middleware/authenticate-request';
import { cache } from '@/resources/cache';
import prisma from '@/resources/prisma';
import type { Request, Response } from 'express';

export const GET = [
	authenticateRequest(),
	async (req: Request, res: Response) => {
		const project = await cache(
			prisma.project.findFirst({
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
			}),
			{
				key: `project:${req.params.id}:${req.userId}`,
				ttl: '60s'
			}
		);

		if (!project) {
			return res.status(404).json({ error: 'Project not found' });
		}

		return res.json({ project });
	}
];
