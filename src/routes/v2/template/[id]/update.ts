import type { Request, Response } from 'express';
import { z } from 'zod';
import { authenticateRequest } from '@/middleware/authenticate-request';
import { validateSchema } from '@/middleware/validate-schema';
import prisma from '@/resources/prisma';

const schema = z.object({
	name: z.string().min(1).optional(),
});

export const POST = [
	authenticateRequest(),
	validateSchema(schema),
	async (req: Request, res: Response) => {
		const body = req.body as z.infer<typeof schema>;

		const existing = await prisma.tilePage.findFirst({
			where: {
				id: req.params.id,
				userId: req.userId,
				isTemplate: true,
			},
		});

		if (!existing) {
			return res.status(404).json({ error: 'Template not found.' });
		}

		const template = await prisma.tilePage.update({
			where: { id: req.params.id },
			data: {
				name: body.name,
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
			},
		});

		return res.json({
			template: {
				...template,
				project: template.connectedProjects[0]?.project || null,
			},
		});
	},
];
