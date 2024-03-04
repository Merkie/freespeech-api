export default async function ListVoices(apiKey: string) {
	const response = await fetch('https://api.elevenlabs.io/v1/voices', {
		headers: {
			'xi-api-key': apiKey
		}
	});

	const body = await response.json();

	if (!body.voices) return [];

	return body.voices.map((voice: any) => ({
		voice_id: voice.voice_id,
		name: voice.name,
		premade: voice.category === 'premade',
		accent: voice.labels.accent,
		description: voice.labels.description,
		age: voice.labels.age,
		gender: voice.labels.gender
	}));
}
