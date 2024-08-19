import { CLIENT_HOST, GOOGLE_CLIENT_ID } from '@/utils/env';
import type { Request, Response } from 'express';

export const GET = [
	async (req: Request, res: Response) => {
		const googleUrl = getGoogleOauthUrl();

		return res.json({ google: googleUrl });
	}
];

function getGoogleOauthUrl() {
	const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');

	url.searchParams.append('client_id', GOOGLE_CLIENT_ID);
	url.searchParams.append('redirect_uri', CLIENT_HOST + '/oauth/google');
	url.searchParams.append('access_type', 'offline');
	url.searchParams.append('response_type', 'code');
	url.searchParams.append('prompt', 'consent');
	url.searchParams.append(
		'scope',
		[
			'https://www.googleapis.com/auth/userinfo.email',
			'https://www.googleapis.com/auth/userinfo.profile'
		].join(' ')
	);

	return url;
}
