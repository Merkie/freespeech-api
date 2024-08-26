import { authenticateRequest } from '@/middleware/authenticate-request';
import { validateSchema } from '@/middleware/validate-schema';
import prisma from '@/resources/prisma';
import slugify from '@/utils/slugify';
import type { Request, Response } from 'express';
import { z } from 'zod';

const schema = z.object({
	name: z.string(),
	columns: z.number(),
	rows: z.number()
});

export const POST = [
	authenticateRequest(),
	validateSchema(schema),
	async (req: Request, res: Response) => {
		const body = req.body as z.infer<typeof schema>;

		// Get all user projects
		const projects = await prisma.project.findMany({
			where: {
				userId: req.userId
			}
		});

		// Check if the project name is already taken
		if (projects.map((project) => slugify(project.name)).includes(slugify(body.name)))
			return res.json({
				error: 'A project with that name already exists.'
			});

		// Create the project
		const createdProject = await prisma.project.create({
			data: {
				name: body.name,
				description: '',
				isPublic: false,
				columns: body.columns,
				rows: body.rows,
				userId: req.userId!
			}
		});

		// Create the home page
		const createdHomePage = await prisma.tilePage.create({
			data: {
				name: 'Home',
				userId: req.userId!,
				connectedProjects: {
					create: {
						projectId: createdProject.id
					}
				}
			}
		});

		// Create a tile for the home page
		await prisma.tile.create({
			data: {
				tilePageId: createdHomePage.id,
				page: 0,
				x: 0,
				y: 0
			}
		});

		return res.json({ success: true, projectId: createdProject.id });
	}
];
