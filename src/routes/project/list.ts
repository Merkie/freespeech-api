import { authenticateRequest } from '@/middleware/authenticate-request';
import prisma from '@/resources/prisma';
import { cache } from '@/resources/cache';
import type { Request, Response } from 'express';

export const GET = [
	authenticateRequest(),
	async (req: Request, res: Response) => {
		const projects = await cache(
			(async () => {
				return await prisma.project.findMany({
					where: {
						userId: req.userId
					},
					orderBy: {
						updatedAt: 'desc'
					}
				});
			})(),
			{
				key: `projects:${req.userId}`,
				ttl: '1d'
			}
		);

		return res.json({ projects });
	}
];
