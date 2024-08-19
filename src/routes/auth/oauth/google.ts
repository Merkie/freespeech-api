import type { Request, Response } from 'express';
import prisma from '@/resources/prisma';
import { generateToken } from '@/utils/token';
import { CLIENT_HOST, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from '@/utils/env';

export const GET = [
	async (req: Request, res: Response) => {
		const code = req.query.code as string;
		if (!code) return res.status(400).json({ error: 'No code provided' });

		const { access_token } = await getAccessToken(code);
		if (!access_token) return res.status(400).json({ error: 'No access token.' });

		const profile = await getProfile(access_token);
		if (!profile || !profile.email) return res.status(400).json({ error: 'No profile or email.' });

		const existingUser = await prisma.user.findUnique({ where: { email: profile.email } });

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

async function getAccessToken(code: string) {
	const url = new URL('https://oauth2.googleapis.com/token');

	url.searchParams.append('client_id', GOOGLE_CLIENT_ID);
	url.searchParams.append('client_secret', GOOGLE_CLIENT_SECRET);
	url.searchParams.append('code', code);
	url.searchParams.append('grant_type', 'authorization_code');
	url.searchParams.append('redirect_uri', CLIENT_HOST + '/auth/oauth/google');

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
