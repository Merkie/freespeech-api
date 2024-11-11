import { authenticateRequest } from '@/middleware/authenticate-request';
import { validateSchema } from '@/middleware/validate-schema';
import prisma from '@/resources/prisma';
import { invalidateCache } from '@/resources/cache';
import type { Request, Response } from 'express';
import { z } from 'zod';

const schema = z.object({
	name: z.string().min(1).max(255).optional(),
	columns: z.number().min(1).max(60).optional(),
	rows: z.number().min(1).max(60).optional(),
	imageUrl: z.string().optional()
});

export const POST = [
	authenticateRequest(),
	validateSchema(schema),
	async (req: Request, res: Response) => {
		const body = req.body as z.infer<typeof schema>;

		await prisma.project.update({
			where: {
				id: req.params.id as string,
				userId: req.userId
			},
			data: body
		});

		invalidateCache(`project:${req.params.id}:${req.userId}`);
		invalidateCache(`projects:${req.userId}`);

		return res.json({ success: true });
	}
];
