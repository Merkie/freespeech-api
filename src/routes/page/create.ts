import { z } from 'zod';
import type { Request, Response } from 'express';
import { authenticateRequest } from '@/middleware/authenticate-request';
import { validateSchema } from '@/middleware/validate-schema';
import prisma from '@/resources/prisma';
import slugify from '@/utils/slugify';
import { invalidateCache } from '@/resources/cache';

const schema = z.object({
	name: z.string().min(1).max(50),
	projectId: z.string()
});

export const POST = [
	authenticateRequest(),
	validateSchema(schema),
	async (req: Request, res: Response) => {
		const body = req.body as z.infer<typeof schema>;

		// Get the project
		const project = await prisma.project.findUnique({
			where: {
				id: body.projectId,
				userId: req.userId
			},
			include: {
				connectedPages: {
					include: {
						tilePage: true
					}
				}
			}
		});

		// Check if the project exists
		if (!project) return res.json({ error: 'The project you are trying to edit does not exist.' });

		// Check if the page already exists
		if (
			project.connectedPages
				.map(({ tilePage }) => slugify(tilePage.name))
				.includes(slugify(body.name))
		)
			return res.json({
				error: 'A page with that name already exists in the project.'
			});

		// Create the page
		const page = await prisma.tilePage.create({
			data: {
				name: body.name,
				user: {
					connect: {
						id: req.userId
					}
				},
				connectedProjects: {
					create: {
						projectId: project.id
					}
				},
				tiles: {
					create: {
						page: 0,
						x: 0,
						y: 0
					}
				}
			}
		});

		invalidateCache(`project:${req.params.id}:${req.userId}`);

		return res.json({ page });
	}
];
