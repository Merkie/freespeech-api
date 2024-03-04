import { Router } from 'express';
import elevenlabs from '../../elevenlabs';

export const elevenlabsRouter = Router();

elevenlabsRouter.get('/voices/list', async function (req, res) {
	let apiKey = (req.headers['elevenlabs-key'] as string) || process.env.ELEVEN_LABS_KEY;

	if (!apiKey) return res.json({ error: 'Eleven Labs API key not found.', voices: [] });

	const voices = await elevenlabs.voices.list(apiKey);
	res.json({
		voices
	});
});

elevenlabsRouter.post('/speak', async function (req, res) {
	let apiKey = (req.headers['elevenlabs-key'] as string) || process.env.ELEVEN_LABS_KEY;

	if (!apiKey) return res.json({ error: 'Eleven Labs API key not found.' });

	const { voice_id, text } = req.body;
	const audio = await elevenlabs.speak(apiKey, voice_id, text);

	res.set('Content-Type', 'audio/mpeg');
	res.send(Buffer.from(audio));
});
