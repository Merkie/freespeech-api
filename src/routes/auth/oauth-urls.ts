import { validateSchema } from '@/middleware/validate-schema';
import { GOOGLE_CLIENT_ID } from '@/utils/env';
import type { Request, Response } from 'express';
import { z } from 'zod';

const schema = z.object({
	origin: z.string(),
	// Opaque value echoed back by Google on the callback — the native app
	// passes 'app' so the web callback knows to hand the token off to it.
	state: z.string().optional()
});

export const POST = [
	validateSchema(schema),
	async (req: Request, res: Response) => {
		const body = req.body as z.infer<typeof schema>;

		const googleUrl = getGoogleOauthUrl(body.origin, body.state);

		return res.json({ google: googleUrl });
	}
];

function getGoogleOauthUrl(origin: string, state?: string) {
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
	if (state) url.searchParams.append('state', state);

	return url;
}
