import type { Request, Response } from 'express';
import { z } from 'zod';
import { authenticateRequest } from '@/middleware/authenticate-request';
import { validateSchema } from '@/middleware/validate-schema';
import prisma from '@/resources/prisma';

const tileSchema = z.object({
	x: z.number(),
	y: z.number(),
	page: z.number().optional().default(0),
	text: z.string().optional().default('New tile'),
	backgroundColor: z.string().optional().default('#fafafa'),
	borderColor: z.string().optional().default('#71717a'),
	image: z.string().optional().default(''),
	navigation: z.string().optional().default(''),
	displayText: z.string().optional().default(''),
});

const schema = z.object({
	name: z.string().min(1),
	projectId: z.string(),
	tiles: z.array(tileSchema).optional().default([]),
});

export const POST = [
	authenticateRequest(),
	validateSchema(schema),
	async (req: Request, res: Response) => {
		const body = req.body as z.infer<typeof schema>;

		// Verify project exists and belongs to user
		const project = await prisma.project.findFirst({
			where: {
				id: body.projectId,
				userId: req.userId,
			},
		});

		if (!project) {
			return res.status(404).json({ error: 'Project not found.' });
		}

		// Create template page and connect to project
		const template = await prisma.tilePage.create({
			data: {
				userId: req.userId,
				name: body.name,
				isTemplate: true,
				tiles: {
					create: body.tiles.map((tile) => ({
						x: tile.x,
						y: tile.y,
						page: tile.page,
						text: tile.text,
						backgroundColor: tile.backgroundColor,
						borderColor: tile.borderColor,
						image: tile.image,
						navigation: tile.navigation,
						displayText: tile.displayText,
					})),
				},
				connectedProjects: {
					create: {
						projectId: body.projectId,
					},
				},
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
