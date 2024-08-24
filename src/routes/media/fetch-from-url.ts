import type { Request, Response } from 'express';
import { authenticateRequest } from '@/middleware/authenticate-request';
import { validateSchema } from '@/middleware/validate-schema';
import { z } from 'zod';

const schema = z.object({
	url: z.string().url()
});

export const POST = [
	authenticateRequest(),
	validateSchema(schema),
	async (req: Request, res: Response) => {
		const body = req.body as z.infer<typeof schema>;

		const response = await fetch(body.url);

		if (!response.ok) {
			return res.status(response.status).send('Failed to fetch the image');
		}

		const arrayBuffer = await response.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		res.setHeader(
			'Content-Type',
			response.headers.get('content-type') || 'application/octet-stream'
		);
		res.setHeader('Content-Length', buffer.length.toString());
		res.setHeader(
			'Content-Disposition',
			`attachment; filename="image.${
				response.headers.get('content-type')?.split('/').pop() || 'jpg'
			}"`
		);

		res.end(buffer);
	}
];
