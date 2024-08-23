import { authenticateRequest } from '@/middleware/authenticate-request';
import prisma from '@/resources/prisma';
import type { Request, Response } from 'express';

export const GET = [
	authenticateRequest(),
	async (req: Request, res: Response) => {
		const projects = await prisma.project.findMany({
			where: {
				userId: req.userId
			},
			orderBy: {
				updatedAt: 'desc'
			}
		});

		return res.json({ projects });
	}
];
