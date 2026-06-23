import { authenticateRequest } from '@/middleware/authenticate-request';
import { validateSchema } from '@/middleware/validate-schema';
import prisma from '@/resources/prisma';
import type { Request, Response } from 'express';
import { z } from 'zod';

const schema = z.object({
	name: z.string().min(1).max(255).optional(),
	columns: z.number().min(1).max(60).optional(),
	rows: z.number().min(1).max(60).optional(),
	imageUrl: z.string().optional(),
	homePageId: z.string().optional()
});

export const POST = [
	authenticateRequest(),
	validateSchema(schema),
	async (req: Request, res: Response) => {
		const body = req.body as z.infer<typeof schema>;

		// If setting the home page, make sure it's actually a page in this project.
		if (body.homePageId) {
			const link = await prisma.tilePageInProject.findFirst({
				where: {
					projectId: req.params.id as string,
					tilePageId: body.homePageId,
					project: { userId: req.userId }
				}
			});

			if (!link) return res.json({ error: 'That page is not part of this project.' });
		}

		await prisma.project.update({
			where: {
				id: req.params.id as string,
				userId: req.userId
			},
			data: body
		});

		return res.json({ success: true });
	}
];
