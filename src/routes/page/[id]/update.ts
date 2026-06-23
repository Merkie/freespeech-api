import { z } from 'zod';
import type { Request, Response } from 'express';
import { authenticateRequest } from '@/middleware/authenticate-request';
import { validateSchema } from '@/middleware/validate-schema';
import prisma from '@/resources/prisma';
import slugify from '@/utils/slugify';

const schema = z.object({
	name: z.string().min(1).max(50).optional()
});

export const POST = [
	authenticateRequest(),
	validateSchema(schema),
	async (req: Request, res: Response) => {
		const body = req.body as z.infer<typeof schema>;
		const pageId = req.params.id as string;

		// If renaming, make sure no sibling page in the same project(s) already
		// uses that name (mirrors the duplicate check in page/create).
		if (body.name) {
			const links = await prisma.tilePageInProject.findMany({
				where: {
					tilePageId: pageId,
					project: { userId: req.userId }
				},
				select: { projectId: true }
			});

			const siblings = await prisma.tilePageInProject.findMany({
				where: {
					projectId: { in: links.map((l) => l.projectId) },
					tilePageId: { not: pageId }
				},
				include: { tilePage: true }
			});

			if (siblings.map(({ tilePage }) => slugify(tilePage.name)).includes(slugify(body.name)))
				return res.json({
					error: 'A page with that name already exists in the project.'
				});
		}

		await prisma.tilePage.update({
			where: {
				id: req.params.id as string,
				userId: req.userId
			},
			data: body
		});

		return res.json({ success: true });
	}
];
