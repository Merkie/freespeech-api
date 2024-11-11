import { authenticateRequest } from '@/middleware/authenticate-request';
import prisma from '@/resources/prisma';
import { invalidateCache } from '@/resources/cache';
import type { Request, Response } from 'express';

export const DELETE = [
	authenticateRequest(),
	async (req: Request, res: Response) => {
		const project = await prisma.project.findFirst({
			where: {
				id: req.params.id as string,
				userId: req.userId
			},
			include: {
				connectedPages: {
					where: {
						tilePage: {
							userId: req.userId
						}
					},
					include: {
						tilePage: true
					}
				}
			}
		});

		if (!project) {
			return res.json({
				success: false,
				error: 'Project not found'
			});
		}

		const pageIds = project.connectedPages.map(({ tilePage }) => tilePage.id);

		await prisma.tilePage.deleteMany({
			where: {
				id: {
					in: pageIds
				}
			}
		});

		await prisma.project.delete({
			where: {
				id: req.params.id as string
			}
		});

		invalidateCache(`project:${req.params.id}:${req.userId}`);
		invalidateCache(`projects:${req.userId}`);

		return res.json({ success: true });
	}
];
