import { authenticateRequest } from '@/middleware/authenticate-request';
import prisma from '@/resources/prisma';
import type { Request, Response } from 'express';

export const DELETE = [
	authenticateRequest(),
	async (req: Request, res: Response) => {
		const pageId = req.params.id as string;

		// Check if this page is a home page for any project
		const projectWithThisHomePage = await prisma.project.findFirst({
			where: {
				homePageId: pageId,
				userId: req.userId
			}
		});

		if (projectWithThisHomePage) {
			return res.status(400).json({
				error: 'Cannot delete the home page. Every project must have a home page.'
			});
		}

		await prisma.tilePage.delete({
			where: {
				userId: req.userId,
				id: pageId
			}
		});

		return res.json({
			message: 'Page deleted successfully.'
		});
	}
];
