import type { Request, Response } from 'express';
import { validateSchema } from '@/middleware/validate-schema';
import prisma from '@/resources/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { generateToken } from '@/utils/token';

const schema = z.object({
	email: z.string().email(),
	password: z.string()
});

export const POST = [
	validateSchema(schema),
	async (req: Request, res: Response) => {
		const body = req.body as z.infer<typeof schema>;

		const user = await prisma.user.findFirst({
			where: {
				email: {
					equals: body.email,
					mode: 'insensitive'
				}
			}
		});
		if (!user) return res.status(401).json({ message: 'Invalid email or password' });

		const doPasswordsMatch = bcrypt.compareSync(body.password, user.password);
		if (!doPasswordsMatch) return res.status(401).json({ message: 'Invalid email or password' });

		const { token } = generateToken(user.id);

		return res.json({ token });
	}
];
