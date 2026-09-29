import { authenticateRequest } from '@/middleware/authenticate-request';
import { validateSchema } from '@/middleware/validate-schema';
import prisma from '@/resources/prisma';
import s3 from '@/resources/s3';
import { deleteAccountFailureLimiter } from '@/utils/auth-limits';
import { R2_BUCKET } from '@/utils/env';
import { sendTooManyRequests } from '@/utils/rate-limit';
import { deleteUserMedia, findUserMediaFolders } from '@/utils/user-media';
import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import { z } from 'zod';

// Self-service account deletion. Password accounts confirm with their password; Google-only
// accounts (no password) confirm by typing their email.
const schema = z.object({
	password: z.string().optional(),
	email: z.string().optional()
});

export const POST = [
	authenticateRequest(),
	validateSchema(schema),
	async (req: Request, res: Response) => {
		const body = req.body as z.infer<typeof schema>;

		const user = await prisma.user.findUnique({ where: { id: req.userId } });
		if (!user) return res.status(404).json({ error: 'User not found' });

		const retryAfter = deleteAccountFailureLimiter.retryAfter(user.id);
		if (retryAfter) return sendTooManyRequests(res, retryAfter, 'Too many incorrect attempts.');

		if (user.password) {
			if (!body.password || !bcrypt.compareSync(body.password, user.password)) {
				deleteAccountFailureLimiter.hit(user.id);
				return res.status(401).json({ error: 'Incorrect password.' });
			}
		} else if ((body.email || '').trim().toLowerCase() !== user.email.toLowerCase()) {
			deleteAccountFailureLimiter.hit(user.id);
			return res.status(400).json({ error: 'The email you typed does not match this account.' });
		}

		const mediaFolders = await findUserMediaFolders(prisma, user);

		// Pages and tiles have a single owner (TilePage.userId); a page is never shared into another
		// account's project. Only rows this user owns are deleted. Link rows that merely point at
		// their pages or projects go with them; the other side of a link is left alone.
		const deleted = await prisma.$transaction(
			async (tx) => {
				const tiles = await tx.tile.deleteMany({ where: { TilePage: { userId: user.id } } });
				const templateLinks = await tx.pageTemplateLink.deleteMany({
					where: {
						OR: [{ tilePage: { userId: user.id } }, { templatePage: { userId: user.id } }]
					}
				});
				const pageLinks = await tx.tilePageInProject.deleteMany({
					where: { OR: [{ project: { userId: user.id } }, { tilePage: { userId: user.id } }] }
				});
				const pages = await tx.tilePage.deleteMany({ where: { userId: user.id } });
				const projects = await tx.project.deleteMany({ where: { userId: user.id } });
				await tx.user.delete({ where: { id: user.id } });

				return {
					projects: projects.count,
					pages: pages.count,
					tiles: tiles.count,
					pageLinks: pageLinks.count,
					templateLinks: templateLinks.count
				};
			},
			{ maxWait: 10_000, timeout: 120_000 }
		);

		deleteAccountFailureLimiter.reset(user.id);
		console.log(`[user/delete] Deleted account ${user.id}:`, JSON.stringify(deleted));

		res.json({ success: true });

		// Best effort, after responding: the account is already gone if this fails.
		deleteUserMedia({ prisma, s3, bucket: R2_BUCKET, userId: user.id, folders: mediaFolders })
			.then((result) => console.log(`[user/delete] Media for ${user.id}:`, JSON.stringify(result)))
			.catch((error) => console.error(`[user/delete] Media cleanup failed for ${user.id}:`, error));
	}
];
