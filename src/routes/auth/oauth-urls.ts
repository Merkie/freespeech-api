import { validateSchema } from '@/middleware/validate-schema';
import { GOOGLE_CLIENT_ID } from '@/utils/env';
import type { Request, Response } from 'express';
import { z } from 'zod';

const schema = z.object({
	origin: z.string()
});

export const POST = [
	validateSchema(schema),
	async (req: Request, res: Response) => {
		const body = req.body as z.infer<typeof schema>;

		const googleUrl = getGoogleOauthUrl(body.origin);

		return res.json({ google: googleUrl });
	}
];

function getGoogleOauthUrl(origin: string) {
	const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');

	url.searchParams.append('client_id', GOOGLE_CLIENT_ID);
	url.searchParams.append('redirect_uri', `${origin}/oauth/google`);
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
