import { validateSchema } from '@/middleware/validate-schema';
import prisma from '@/resources/prisma';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { getThumbnail } from '../project/[id]/update-thumbnail';
import s3 from '@/resources/s3';
import slugify from '@/utils/slugify';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { R2_BUCKET } from '@/utils/env';
import { authenticateRequest } from '@/middleware/authenticate-request';

const schema = z.object({
	tilePageId: z.string(),
	description: z.string().optional()
});

export const POST = [
	validateSchema(schema),
	authenticateRequest(),
	async (req: Request, res: Response) => {
		const body = req.body as z.infer<typeof schema>;

		const tilePage = await prisma.tilePage.findUnique({
			where: { id: body.tilePageId, userId: req.userId },
			include: {
				connectedProjects: {
					where: {
						project: {
							userId: req.userId
						}
					},
					include: {
						project: {
							include: {
								user: true
							}
						}
					}
				}
			}
		});

		if (!tilePage) return res.status(404).json({ success: false, message: 'Tile page not found' });

		const project = tilePage.connectedProjects.at(0)?.project;

		if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

		const fileName = `${Date.now()}-thumbnail.png`;

		const file = await getThumbnail(project.user.id, project.id, tilePage.id, fileName);

		const newThumbnailKey = `${slugify(project.user.name)}-${project.user.id}/${fileName}`;

		const fileArrayBuffer = await file.arrayBuffer();
		const fileBuffer = Buffer.from(fileArrayBuffer);

		const uploadCommand = new PutObjectCommand({
			Bucket: R2_BUCKET,
			Key: newThumbnailKey,
			Body: fileBuffer,
			ContentType: 'image/png'
		});
		await s3.send(uploadCommand);

		await prisma.marketPlaceTilePage.create({
			data: {
				tilePageId: body.tilePageId,
				name: tilePage.name,
				description: body.description,
				imageUrl: '/' + newThumbnailKey
			}
		});

		return res.json({ success: true });
	}
];
