import { z } from 'zod';
import Cryptr from 'cryptr';
import type { Request, Response } from 'express';
import { authenticateRequest } from '@/middleware/authenticate-request';
import { validateSchema } from '@/middleware/validate-schema';
import prisma from '@/resources/prisma';
import { SITE_SECRET } from '@/utils/env';

const schema = z.object({
	name: z.string().optional(),
	profileImgUrl: z.string().optional(),
	elevenLabsApiKey: z.string().optional(),
	usePersonalElevenLabsKey: z.boolean().optional()
});

export const POST = [
	authenticateRequest(),
	validateSchema(schema),
	async (req: Request, res: Response) => {
		let body = req.body as z.infer<typeof schema>;

		const fetchedUser = await prisma.user.findUnique({
			where: {
				id: req.userId
			}
		});
		if (!fetchedUser) return res.json({ error: 'User not found' });

		if (body.elevenLabsApiKey) {
			const cryptr = new Cryptr(SITE_SECRET);
			body.elevenLabsApiKey = cryptr.encrypt(body.elevenLabsApiKey);
		}

		await prisma.user.update({
			where: {
				id: req.userId
			},
			data: body
		});

		return res.json({ success: true });
	}
];
