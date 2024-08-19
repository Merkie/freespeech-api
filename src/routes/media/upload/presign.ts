import type { Request, Response } from 'express';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { z } from 'zod';
import slugify from '@/utils/slugify';
import { authenticateRequest } from '@/middleware/authenticate-request';
import { validateSchema } from '@/middleware/validate-schema';
import prisma from '@/resources/prisma';
import s3 from '@/resources/s3';
import { R2_BUCKET } from '@/utils/env';

const schema = z.object({
	filename: z.string() // someimage.png
});

export const POST = [
	authenticateRequest(),
	validateSchema(schema),
	async (req: Request, res: Response) => {
		const body = req.body as z.infer<typeof schema>;

		const user = await prisma.user.findUnique({
			where: {
				id: req.userId
			}
		});

		if (!user) return res.json({ error: 'User not found' });

		const ext = body.filename.split('.').at(-1);
		const key = `${slugify(user.name)}-${user.id}/${Date.now()}-${slugify(
			body.filename.split('.').slice(0, -1).join('').substring(0, 50)
		)}.${slugify(ext + '')}`;

		const presignedUrl = await createPresignedUrl(s3, R2_BUCKET, key);

		return res.json({ presignedUrl, key });
	}
];

async function createPresignedUrl(s3: S3Client, bucket: string, key: string): Promise<string> {
	const command = new PutObjectCommand({ Bucket: bucket, Key: key });
	return getSignedUrl(s3, command, { expiresIn: 3600 });
}
