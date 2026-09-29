import { DeleteObjectsCommand, ListObjectsV2Command, type S3Client } from '@aws-sdk/client-s3';
import type { PrismaClient } from '@prisma/client';
import slugify from './slugify';

export const MEDIA_URL = 'https://media.freespeechaac.com';

// Uploads and thumbnails are stored under "<slugified name>-<user id>/", so a key whose first path
// segment ends in "-<user id>" belongs to that user. Nothing else in the bucket (background-removal
// output at the root, template images, other users' folders) is ever touched. Boards can be copied
// between accounts with their image URLs, so a key someone else still references is kept.

/** R2 key for a stored media reference ("/key", the media domain, or the old r2.dev URLs). */
export function mediaKeyFromUrl(value: string | null | undefined) {
	if (!value) return null;
	if (value.startsWith('/') && !value.startsWith('//')) return value.slice(1).split('?')[0] || null;

	try {
		const url = new URL(value);
		const isOurMedia =
			url.hostname === new URL(MEDIA_URL).hostname || url.hostname.endsWith('.r2.dev');
		if (!isOurMedia) return null;
		return decodeURIComponent(url.pathname.slice(1)) || null;
	} catch {
		return null;
	}
}

/** Absolute URL for a stored media reference, for exports. */
export function absoluteMediaUrl(value: string | null | undefined) {
	if (!value) return null;
	if (value.startsWith('/') && !value.startsWith('//')) return `${MEDIA_URL}${value}`;
	return value;
}

function ownerSegment(key: string, userId: string) {
	const [segment, ...rest] = key.split('/');
	return rest.length > 0 && segment.endsWith(`-${userId}`) ? segment : null;
}

/** Every stored URL, from any account, that points into one of this user's folders. */
async function referencesToUserFolders(prisma: PrismaClient, userId: string) {
	const marker = `-${userId}/`;
	const [tiles, projects, users] = await Promise.all([
		prisma.tile.findMany({ where: { image: { contains: marker } }, select: { image: true } }),
		prisma.project.findMany({
			where: { imageUrl: { contains: marker } },
			select: { imageUrl: true }
		}),
		prisma.user.findMany({
			where: { profileImgUrl: { contains: marker } },
			select: { profileImgUrl: true }
		})
	]);

	return [
		...tiles.map((tile) => tile.image),
		...projects.map((project) => project.imageUrl),
		...users.map((user) => user.profileImgUrl)
	]
		.map(mediaKeyFromUrl)
		.filter((key): key is string => !!key);
}

/** Call before deleting the user's rows: the folders their media lives in. */
export async function findUserMediaFolders(
	prisma: PrismaClient,
	user: { id: string; name: string }
) {
	const folders = new Set([`${slugify(user.name)}-${user.id}`]);
	for (const key of await referencesToUserFolders(prisma, user.id)) {
		const segment = ownerSegment(key, user.id);
		if (segment) folders.add(segment);
	}
	return [...folders];
}

/** Call after the user's rows are gone. Deletes their folders except keys still referenced. */
export async function deleteUserMedia({
	prisma,
	s3,
	bucket,
	userId,
	folders
}: {
	prisma: PrismaClient;
	s3: Pick<S3Client, 'send'>;
	bucket: string;
	userId: string;
	folders: string[];
}) {
	const stillReferenced = new Set(await referencesToUserFolders(prisma, userId));
	const toDelete: string[] = [];
	let kept = 0;

	for (const folder of folders) {
		if (!folder.endsWith(`-${userId}`)) continue;

		let continuationToken: string | undefined;
		do {
			const page = await s3.send(
				new ListObjectsV2Command({
					Bucket: bucket,
					Prefix: `${folder}/`,
					ContinuationToken: continuationToken
				})
			);
			for (const object of page.Contents || []) {
				if (!object.Key || ownerSegment(object.Key, userId) !== folder) continue;
				if (stillReferenced.has(object.Key)) kept += 1;
				else toDelete.push(object.Key);
			}
			continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
		} while (continuationToken);
	}

	let deleted = 0;
	for (let i = 0; i < toDelete.length; i += 1000) {
		const batch = toDelete.slice(i, i + 1000);
		const result = await s3.send(
			new DeleteObjectsCommand({
				Bucket: bucket,
				Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true }
			})
		);
		deleted += batch.length - (result.Errors?.length || 0);
	}

	return { deleted, kept, failed: toDelete.length - deleted };
}
