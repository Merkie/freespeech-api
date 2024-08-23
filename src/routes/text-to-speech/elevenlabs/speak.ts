import { ELEVEN_LABS_KEY } from '@/utils/env';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { validateSchema } from '@/middleware/validate-schema';
import { authenticateRequest } from '@/middleware/authenticate-request';
import prisma from '@/resources/prisma';
import { DecryptElevenLabsKey } from '@/utils/decrypt-key';

const schema = z.object({
	voiceId: z.string().min(1),
	text: z.string().min(1).max(1500)
});

export const POST = [
	authenticateRequest(),
	validateSchema(schema),
	async (req: Request, res: Response) => {
		const body = req.body as z.infer<typeof schema>;

		const user = await prisma.user.findUnique({
			where: {
				id: req.userId
			}
		});
		if (!user) return res.json({ error: 'User not found' });

		const userKey = user.usePersonalElevenLabsKey
			? DecryptElevenLabsKey(user.elevenLabsApiKey)
			: '';

		if (user.usePersonalElevenLabsKey && !userKey)
			return res.json({
				error: 'User has enabled personal Eleven Labs API key but it is not set'
			});

		const startTime = Date.now();

		const response = await fetch(
			`https://api.elevenlabs.io/v1/text-to-speech/${body.voiceId}?optimize_streaming_latency=1`,
			{
				method: 'POST',
				headers: {
					Accept: 'audio/mpeg',
					'Content-Type': 'application/json',
					'xi-api-key': userKey || ELEVEN_LABS_KEY
				},
				body: JSON.stringify({
					text: body.text
				})
			}
		);

		const audio = await response.arrayBuffer();

		console.log('Eleven Labs API request took', Date.now() - startTime, 'ms');

		res.set('Content-Type', 'audio/mpeg');
		res.send(Buffer.from(audio));
	}
];
