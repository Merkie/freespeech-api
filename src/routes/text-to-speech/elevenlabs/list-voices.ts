import { authenticateRequest } from '@/middleware/authenticate-request';
import prisma from '@/resources/prisma';
import { DecryptElevenLabsKey } from '@/utils/decrypt-key';
import { ELEVEN_LABS_KEY } from '@/utils/env';
import type { Request, Response } from 'express';

export const GET = [
	authenticateRequest(),
	async (req: Request, res: Response) => {
		const user = await prisma.user.findUnique({
			where: {
				id: req.userId
			}
		});
		if (!user) return res.json({ error: 'User not found' });

		const userELKey = DecryptElevenLabsKey(user.elevenLabsApiKey);

		const response = await fetch('https://api.elevenlabs.io/v1/voices', {
			headers: {
				'xi-api-key': userELKey || ELEVEN_LABS_KEY
			}
		}).then((res) => res.json());

		if (response.voices && Array.isArray(response.voices)) {
			let voices = response.voices;
			voices.sort((a: any, b: any) => {
				if (a.category === 'premade' && b.category !== 'premade') return 1;
				if (a.category !== 'premade' && b.category == 'premade') return -1;
				return a.name.localeCompare(b.name);
			});

			// filter out the "seductive" voices lol
			// TODO: add a setting for this
			const filteredVoices = voices.filter(
				(voice: any) =>
					!(voice.category === 'premade' && voice.labels.description?.includes('seductive'))
			);

			return res.json({
				voices: filteredVoices
			});
		} else {
			return res.json({ error: 'Error fetching voices' });
		}
	}
];
