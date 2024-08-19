import { authenticateRequest } from '@/middleware/authenticate-request';
import { BING_IMAGE_SEARCH_KEY } from '@/utils/env';
import type { Request, Response } from 'express';

export const GET = [
	authenticateRequest(),
	async (req: Request, res: Response) => {
		const searchParams = new URL(req.url).searchParams;
		const query = searchParams.get('q') || '';

		const results = await searchBingImages(query);

		return res.json({ results });
	}
];

async function searchBingImages(query: string) {
	if (!query) return [];

	const response = await fetch(
		`https://api.bing.microsoft.com/v7.0/images/search?q=${encodeURIComponent(query)}`,
		{
			headers: {
				'Ocp-Apim-Subscription-Key': BING_IMAGE_SEARCH_KEY
			}
		}
	);
	const data = (await response.json()) as {
		value: {
			name: string;
			contentUrl: string;
			thumbnailUrl: string;
		}[];
	};

	if (!Array.isArray(data.value)) return [];

	const results = data.value.map((result) => ({
		alt: result.name,
		image_url: result.contentUrl,
		thumbnail_url: result.thumbnailUrl
	}));

	return results;
}
