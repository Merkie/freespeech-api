import type { Request, Response } from 'express';
import prisma from '@/resources/prisma';
import { generateToken } from '@/utils/token';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from '@/utils/env';
import { z } from 'zod';
import { validateSchema } from '@/middleware/validate-schema';

const schema = z.object({
	origin: z.string(),
	code: z.string()
});

export const POST = [
	validateSchema(schema),
	async (req: Request, res: Response) => {
		const body = req.body as z.infer<typeof schema>;

		const { access_token } = await getAccessToken(body.origin, body.code);
		if (!access_token) return res.status(400).json({ error: 'No access token.' });

		const profile = await getProfile(access_token);
		if (!profile || !profile.email) return res.status(400).json({ error: 'No profile or email.' });

		// Matched case-insensitively, like login / register / forgot-password. An exact findUnique
		// here meant that when Google returned an address whose case differed from the stored one,
		// the account was not found and a second, empty one was created instead. Six such pairs
		// already exist in this database.
		// Oldest first so the original account wins deterministically rather than by query plan.
		// NOTE: deploy this only after those pairs have been merged — until then it changes which
		// of the two accounts an affected user lands in when signing in with Google.
		const existingUser = await prisma.user.findFirst({
			where: {
				email: {
					equals: profile.email,
					mode: 'insensitive'
				}
			},
			orderBy: { createdAt: 'asc' }
		});

		let tokenUserId = '';

		if (existingUser) {
			tokenUserId = existingUser.id;
		} else {
			const createdUser = await prisma.user.create({
				data: {
					email: profile.email,
					name: profile.name,
					profileImgUrl: profile.picture
				}
			});

			tokenUserId = createdUser.id;
		}

		const { token } = generateToken(tokenUserId);

		return res.json({ token });
	}
];

async function getAccessToken(origin: string, code: string) {
	const url = new URL('https://oauth2.googleapis.com/token');

	url.searchParams.append('client_id', GOOGLE_CLIENT_ID);
	url.searchParams.append('client_secret', GOOGLE_CLIENT_SECRET);
	url.searchParams.append('code', code);
	url.searchParams.append('grant_type', 'authorization_code');
	url.searchParams.append('redirect_uri', `${origin}/oauth/google`);

	const response = await fetch(url, {
		method: 'POST'
	});

	return response.json() as Promise<{
		access_token: string;
	}>;
}

async function getProfile(access_token: string) {
	const url = new URL('https://www.googleapis.com/oauth2/v2/userinfo');

	url.searchParams.append('access_token', access_token);

	const response = await fetch(url);

	return response.json() as Promise<{
		id: string;
		email: string;
		name: string;
		picture: string;
	}>;
}
