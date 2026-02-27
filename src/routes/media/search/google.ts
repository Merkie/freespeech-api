import type { Request, Response } from 'express';
import { authenticateRequest } from '@/middleware/authenticate-request';
import { BRAVE_SEARCH_API_KEY } from '@/utils/env';

export const GET = [
	authenticateRequest(),
	async (req: Request, res: Response) => {
		const query = `${req.query.q}`;

		const results = await searchImages(query);

		return res.json({ results });
	}
];

interface BraveImage {
	title: string;
	thumbnail: {
		src: string;
	};
	properties: {
		url: string;
	};
}

interface BraveImageSearchResponse {
	results?: BraveImage[];
}

async function searchImages(query: string) {
	if (!query) return [];

	try {
		const url = `https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(query)}&count=50`;

		const response = await fetch(url, {
			headers: {
				'Accept': 'application/json',
				'X-Subscription-Token': BRAVE_SEARCH_API_KEY
			}
		});

		if (!response.ok) {
			console.error('Brave image search error:', response.status, response.statusText);
			return [];
		}

		const data: BraveImageSearchResponse = await response.json();

		if (!data.results || !Array.isArray(data.results)) return [];

		const results = data.results.map((image) => ({
			alt: image.title || '',
			image_url: image.properties.url,
			thumbnail_url: image.thumbnail.src
		}));

		return results;
	} catch (error) {
		console.error('Brave image search error:', error);
		return [];
	}
}
