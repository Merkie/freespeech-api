import { authenticateRequest } from '@/middleware/authenticate-request';
import { BRIGHT_DATA_PROXY_URL } from '@/utils/env';
import type { Request, Response } from 'express';
import axios from 'axios';

export const GET = [
	authenticateRequest(),
	async (req: Request, res: Response) => {
		const query = req.query.q + '';

		const results = await searchImages(query);

		return res.json({ results });
	}
];

interface BrightDataImage {
	link: string;
	original_image: string;
	title: string;
	source: string;
	image?: string;
	image_alt?: string;
	image_base64?: string;
}

interface BrightDataResponse {
	images?: BrightDataImage[];
}

function parseProxyUrl(proxyUrl: string) {
	const url = new URL(proxyUrl);
	return {
		host: url.hostname,
		port: parseInt(url.port, 10),
		auth: {
			username: decodeURIComponent(url.username),
			password: decodeURIComponent(url.password)
		}
	};
}

async function searchImages(query: string) {
	if (!query) return [];

	try {
		const proxy = parseProxyUrl(BRIGHT_DATA_PROXY_URL);
		const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&brd_mobile=desktop&tbm=isch&brd_json=1`;

		const response = await axios.get<BrightDataResponse>(searchUrl, {
			proxy,
			timeout: 30000,
			httpsAgent: new (require('https').Agent)({
				rejectUnauthorized: false
			})
		});

		const data = response.data;

		if (!data.images || !Array.isArray(data.images)) return [];

		const results = data.images.map((image) => ({
			alt: image.title || image.image_alt || '',
			image_url: image.original_image,
			thumbnail_url: image.original_image
		}));

		return results;
	} catch (error) {
		console.error('Bright Data image search error:', error);
		return [];
	}
}
