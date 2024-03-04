export default async function TextToSpeech(apiKey: string, voiceId: string, text: string) {
	const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'audio/mpeg',
			'xi-api-key': apiKey
		},
		body: JSON.stringify({
			text: text,
			model_id: 'eleven_multilingual_v2',
			voice_settings: {
				stability: 0.75,
				similarity_boost: 0.75
			}
		})
	});

	const audio = await response.arrayBuffer();

	return audio;
}
