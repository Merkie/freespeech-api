import type { Request, Response } from 'express';
import { authenticateRequest } from '@/middleware/authenticate-request';
import { validateSchema } from '@/middleware/validate-schema';
import { SafeFetchError, safeFetch } from '@/utils/safe-fetch';
import { z } from 'zod';

const schema = z.object({
	url: z.string().url()
});

export const POST = [
	authenticateRequest(),
	validateSchema(schema),
	async (req: Request, res: Response) => {
		const body = req.body as z.infer<typeof schema>;

		let response;
		try {
			response = await safeFetch(body.url, {
				maxBytes: 20 * 1024 * 1024,
				timeoutMs: 15000,
				// Same headers Node's fetch sent before, so image hosts see no change.
				headers: { 'User-Agent': 'node', Accept: '*/*', 'Accept-Language': '*' }
			});
		} catch (error) {
			if (error instanceof SafeFetchError) return res.status(error.status).send(error.message);
			throw error;
		}

		if (response.status < 200 || response.status >= 300) {
			return res
				.status(response.status >= 400 ? response.status : 502)
				.send('Failed to fetch the image');
		}

		const contentType = response.contentType || 'application/octet-stream';

		res.setHeader('Content-Type', contentType);
		res.setHeader('Content-Length', response.body.length.toString());
		res.setHeader('X-Content-Type-Options', 'nosniff');
		res.setHeader(
			'Content-Disposition',
			`attachment; filename="image.${
				contentType
					.split(';')[0]
					.split('/')
					.pop()
					?.replace(/[^a-z0-9+.-]/gi, '') || 'jpg'
			}"`
		);

		res.end(response.body);
	}
];
