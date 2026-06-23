import type { Request, Response } from 'express';
import { validateSchema } from '@/middleware/validate-schema';
import prisma from '@/resources/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { readUnverifiedUserId, verifyPasswordResetToken } from '@/utils/token';

const schema = z.object({
	token: z.string().min(1),
	password: z.string().min(8)
});

const INVALID = 'This reset link is invalid or has expired.';

export const POST = [
	validateSchema(schema),
	async (req: Request, res: Response) => {
		const body = req.body as z.infer<typeof schema>;

		const userId = readUnverifiedUserId(body.token);
		if (!userId) return res.status(400).json({ error: INVALID });

		const user = await prisma.user.findUnique({ where: { id: userId } });
		if (!user || !user.password) return res.status(400).json({ error: INVALID });

		// Verify with the user's current password hash mixed into the key — this is
		// what makes the link single-use (it stops verifying once the hash changes).
		const verifiedId = verifyPasswordResetToken(body.token, user.password);
		if (!verifiedId || verifiedId !== user.id) return res.status(400).json({ error: INVALID });

		const hashedPassword = bcrypt.hashSync(body.password, 10);
		await prisma.user.update({
			where: { id: user.id },
			data: { password: hashedPassword }
		});

		return res.json({ success: true });
	}
];
