import type { Request, Response } from 'express';
import { authenticateRequest } from '@/middleware/authenticate-request';
import { validateSchema } from '@/middleware/validate-schema';
import { z } from 'zod';
import sharp from 'sharp';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { createId } from '@paralleldrive/cuid2';
import s3 from '@/resources/s3';
import prisma from '@/resources/prisma';
import { R2_BUCKET } from '@/utils/env';

const schema = z.object({
	dryRun: z.boolean()
});

const MEDIA_HOST = 'media.freespeechaac.com';
const OPTIMIZED_SUFFIX = '-optimized.webp';
const TARGET_SIZE = 250;
const WEBP_QUALITY = 80;

export const POST = [
	authenticateRequest(),
	validateSchema(schema),
	async (req: Request, res: Response) => {
		const { dryRun } = req.body as z.infer<typeof schema>;
		const projectId = req.params.id;

		// Verify project ownership
		const project = await prisma.project.findFirst({
			where: {
				id: projectId,
				userId: req.userId
			}
		});

		if (!project) {
			return res.status(404).json({ error: 'Project not found' });
		}

		// Get all tiles with images for this project via TilePageInProject join
		const tilesWithImages = await prisma.tile.findMany({
			where: {
				TilePage: {
					connectedProjects: {
						some: {
							projectId
						}
					}
				},
				image: {
					not: ''
				}
			},
			select: {
				id: true,
				image: true
			}
		});

		// Filter to only media.freespeechaac.com URLs and skip already-optimized images
		const tilesToOptimize = tilesWithImages.filter((tile) => {
			const imageUrl = tile.image;
			if (!imageUrl.includes(MEDIA_HOST)) return false;
			if (imageUrl.endsWith(OPTIMIZED_SUFFIX)) return false;
			return true;
		});

		if (dryRun) {
			// Estimate sizes - we can't know exact sizes without fetching,
			// so just return the count
			return res.json({
				imageCount: tilesToOptimize.length,
				totalTilesWithImages: tilesWithImages.length,
				alreadyOptimized: tilesWithImages.filter((t) => t.image.endsWith(OPTIMIZED_SUFFIX)).length
			});
		}

		// Perform optimization
		let optimized = 0;
		let failed = 0;
		let oldTotalSize = 0;
		let newTotalSize = 0;
		const updates: { id: string; newUrl: string }[] = [];

		for (const tile of tilesToOptimize) {
			try {
				// Fetch the original image
				const imageResponse = await fetch(tile.image);
				if (!imageResponse.ok) {
					console.error(`Failed to fetch image for tile ${tile.id}: ${imageResponse.status}`);
					failed++;
					continue;
				}

				const originalBuffer = Buffer.from(await imageResponse.arrayBuffer());
				oldTotalSize += originalBuffer.length;

				// Convert with Sharp: resize to fit within TARGET_SIZE, WebP quality
				const optimizedBuffer = await sharp(originalBuffer)
					.resize(TARGET_SIZE, TARGET_SIZE, {
						fit: 'inside',
						withoutEnlargement: true
					})
					.webp({ quality: WEBP_QUALITY })
					.toBuffer();

				newTotalSize += optimizedBuffer.length;

				// Generate new key with -optimized.webp suffix
				const originalKey = new URL(tile.image).pathname.slice(1); // Remove leading /
				const baseName = originalKey.replace(/\.[^.]+$/, ''); // Remove extension
				const newKey = `${baseName}${OPTIMIZED_SUFFIX}`;

				// Upload to R2
				await s3.send(
					new PutObjectCommand({
						Bucket: R2_BUCKET,
						Key: newKey,
						Body: optimizedBuffer,
						ContentType: 'image/webp'
					})
				);

				updates.push({
					id: tile.id,
					newUrl: `https://${MEDIA_HOST}/${newKey}`
				});
				optimized++;
			} catch (error) {
				console.error(`Failed to optimize image for tile ${tile.id}:`, error);
				failed++;
			}
		}

		// Batch update tiles with new URLs via Prisma transaction
		if (updates.length > 0) {
			await prisma.$transaction(
				updates.map((update) =>
					prisma.tile.update({
						where: { id: update.id },
						data: { image: update.newUrl }
					})
				)
			);
		}

		return res.json({
			optimized,
			failed,
			oldTotalSize,
			newTotalSize,
			savedBytes: oldTotalSize - newTotalSize
		});
	}
];
