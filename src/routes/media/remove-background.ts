import type { Request, Response } from 'express';
import { authenticateRequest } from '@/middleware/authenticate-request';
import { validateSchema } from '@/middleware/validate-schema';
import { z } from 'zod';
import { fal } from '@fal-ai/client';

const schema = z.object({
	image_url: z.string().url()
});

export const POST = [
	authenticateRequest(),
	validateSchema(schema),
	async (req: Request, res: Response) => {
		const body = req.body as z.infer<typeof schema>;

		const result = await fal.subscribe('fal-ai/imageutils/rembg', {
			input: {
				image_url: body.image_url,
				crop_to_bbox: true
			}
		});

		const data = result.data as {
			image: {
				url: string;
				content_type: string;
				file_name: string;
				file_size: number;
				width: number;
				height: number;
			};
		};

		res.json({
			image_url: data.image.url
		});
	}
];
