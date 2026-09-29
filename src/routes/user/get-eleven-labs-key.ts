import { authenticateRequest } from '@/middleware/authenticate-request';
import prisma from '@/resources/prisma';
import type { Request, Response } from 'express';
import { DecryptElevenLabsKey } from '@/utils/decrypt-key';

// The key itself never leaves the server; text-to-speech uses it server-side. Clients only learn
// whether one is saved and its last four characters. `key` stays in the response, always empty, for
// clients built before this change.
export const GET = [
	authenticateRequest(),
	async (req: Request, res: Response) => {
		const user = await prisma.user.findUnique({
			where: {
				id: req.userId
			}
		});
		if (!user) return res.json({ error: 'User not found' });

		let last4 = '';
		try {
			last4 = DecryptElevenLabsKey(user.elevenLabsApiKey).slice(-4);
		} catch {
			// An undecryptable value still counts as saved; it can be replaced.
		}

		return res.json({ key: '', isSet: !!user.elevenLabsApiKey, last4 });
	}
];
