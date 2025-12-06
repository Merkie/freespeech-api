import type { Request, Response } from 'express';
import { authenticateRequest } from '@/middleware/authenticate-request';
import { validateSchema } from '@/middleware/validate-schema';
import { z } from 'zod';
import { fal } from '@fal-ai/client';
import sharp from 'sharp';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { createId } from '@paralleldrive/cuid2';
import s3 from '@/resources/s3';
import { R2_BUCKET } from '@/utils/env';

const schema = z.object({
	image_url: z.string().url()
});

export const POST = [
	authenticateRequest(),
	validateSchema(schema),
	async (req: Request, res: Response) => {
		const body = req.body as z.infer<typeof schema>;

		// Use BiRefNet v2 for background removal
		const result = await fal.subscribe('fal-ai/birefnet/v2', {
			input: {
				image_url: body.image_url,
				model: 'General Use (Dynamic)' as any, // This isn't typed in the Fal SDK, but it works
				output_format: 'png'
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

		// Fetch the image and trim transparent pixels
		const imageResponse = await fetch(data.image.url);
		const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

		const trimmedImage = await sharp(imageBuffer).trim().png().toBuffer();

		// Upload trimmed image to R2
		const key = `${createId()}.png`;
		await s3.send(
			new PutObjectCommand({
				Bucket: R2_BUCKET,
				Key: key,
				Body: trimmedImage,
				ContentType: 'image/png'
			})
		);

		res.json({
			image_url: `https://media.freespeechaac.com/${key}`
		});
	}
];
