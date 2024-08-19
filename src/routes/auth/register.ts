import type { Request, Response } from 'express';
import { validateSchema } from '@/middleware/validate-schema';
import prisma from '@/resources/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { generateToken } from '@/utils/token';

const schema = z.object({
	email: z.string().email(),
	name: z.string().min(2),
	password: z.string().min(8)
});

export const POST = [
	validateSchema(schema),
	async (req: Request, res: Response) => {
		const body = req.body as z.infer<typeof schema>;

		const existingUser = await prisma.user.findFirst({
			where: {
				email: {
					equals: body.email,
					mode: 'insensitive'
				}
			}
		});
		if (existingUser) return res.status(400).json({ error: 'User already exists' });

		const hashedPassword = bcrypt.hashSync(body.password, 10);
		const createdUser = await prisma.user.create({
			data: {
				email: body.email,
				password: hashedPassword,
				name: body.name
			}
		});

		const token = generateToken(createdUser.id);
		return res.json({ token });
	}
];
