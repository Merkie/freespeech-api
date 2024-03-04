import { Router } from 'express';
import elevenlabs from '../../elevenlabs';

export const elevenlabsRouter = Router();

elevenlabsRouter.get('/voices/list', async function (req, res) {
	if (!process.env.ELEVEN_LABS_KEY)
		return res.json({ error: 'Eleven Labs API key not found.', voices: [] });

	const voices = await elevenlabs.voices.list(process.env.ELEVEN_LABS_KEY);
	return res.json({
		voices
	});
});
