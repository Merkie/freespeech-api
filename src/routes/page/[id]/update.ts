import { z } from 'zod';
import type { Request, Response } from 'express';
import { authenticateRequest } from '@/middleware/authenticate-request';
import { validateSchema } from '@/middleware/validate-schema';
import prisma from '@/resources/prisma';

const schema = z.object({
	name: z.string().optional()
});

export const POST = [
	authenticateRequest(),
	validateSchema(schema),
	async (req: Request, res: Response) => {
		const body = req.body as z.infer<typeof schema>;

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
