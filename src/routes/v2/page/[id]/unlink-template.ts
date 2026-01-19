import type { Request, Response } from 'express';
import { authenticateRequest } from '@/middleware/authenticate-request';
import prisma from '@/resources/prisma';
import { invalidateCache } from '@/resources/cache';

export const POST = [
	authenticateRequest(),
	async (req: Request, res: Response) => {
		// Verify page exists and belongs to user
		const page = await prisma.tilePage.findFirst({
			where: {
				id: req.params.id,
				userId: req.userId,
			},
		});

		if (!page) {
			return res.status(404).json({ error: 'Page not found.' });
		}

		// Delete the link if it exists
		const existingLink = await prisma.pageTemplateLink.findUnique({
			where: { tilePageId: req.params.id },
		});

		if (existingLink) {
			await prisma.pageTemplateLink.delete({
				where: { tilePageId: req.params.id },
			});
		}

		invalidateCache(`page:${req.params.id}:${req.userId}`);

		return res.json({ success: true });
	},
];
