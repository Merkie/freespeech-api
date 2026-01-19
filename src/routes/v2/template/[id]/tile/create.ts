import type { Request, Response } from 'express';
import { z } from 'zod';
import { authenticateRequest } from '@/middleware/authenticate-request';
import { validateSchema } from '@/middleware/validate-schema';
import prisma from '@/resources/prisma';

const schema = z.object({
	x: z.number(),
	y: z.number(),
	text: z.string().optional().default('New tile'),
	backgroundColor: z.string().optional().default('#fafafa'),
	borderColor: z.string().optional().default('#71717a'),
	image: z.string().optional().default(''),
	navigation: z.string().optional().default(''),
	displayText: z.string().optional().default(''),
});

export const POST = [
	authenticateRequest(),
	validateSchema(schema),
	async (req: Request, res: Response) => {
		const body = req.body as z.infer<typeof schema>;

		const template = await prisma.template.findFirst({
			where: {
				id: req.params.id,
				userId: req.userId,
			},
			include: {
				tiles: true,
			},
		});

		if (!template) {
			return res.status(404).json({ error: 'Template not found.' });
		}

		// Check if tile already exists at position
		const existingTile = template.tiles.find(
			(tile) => tile.x === body.x && tile.y === body.y
		);
		if (existingTile) {
			return res.status(400).json({ error: 'A tile already exists at this position.' });
		}

		const tile = await prisma.templateTile.create({
			data: {
				templateId: req.params.id,
				x: body.x,
				y: body.y,
				text: body.text,
				backgroundColor: body.backgroundColor,
				borderColor: body.borderColor,
				image: body.image,
				navigation: body.navigation,
				displayText: body.displayText,
			},
		});

		return res.json({ tile });
	},
];
