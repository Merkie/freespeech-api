import { authenticateRequest } from '@/middleware/authenticate-request';
import { validateSchema } from '@/middleware/validate-schema';
import prisma from '@/resources/prisma';
import { invalidateCache } from '@/resources/cache';
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

		// Create the project
		const createdProject = await prisma.project.create({
			data: {
				name: body.name,
				description: '',
				isPublic: false,
				columns: body.columns,
				rows: body.rows,
				userId: req.userId!,
				connectedPages: {
					create: [
						{
							tilePage: {
								create: {
									name: 'Home',
									userId: req.userId!,
									tiles: {
										create: {
											page: 0,
											x: 0,
											y: 0
										}
									}
								}
							}
						}
					]
				}
			}
		});

		// // Create the home page
		// const createdHomePage = await prisma.tilePage.create({
		// 	data: {
		// 		name: 'Home',
		// 		userId: req.userId!,
		// 		connectedProjects: {
		// 			create: {
		// 				projectId: createdProject.id
		// 			}
		// 		}
		// 	}
		// });

		// // Create a tile for the home page
		// await prisma.tile.create({
		// 	data: {
		// 		tilePageId: createdHomePage.id,
		// 		page: 0,
		// 		x: 0,
		// 		y: 0
		// 	}
		// });

		invalidateCache(`projects:${req.userId}`);

		return res.json({ success: true, projectId: createdProject.id });
	}
];
