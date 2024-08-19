import { NextFunction, type Request, type Response } from 'express';
import { verifyToken } from '@/utils/token';

export default (
		{
			noRedirect
		}: {
			noRedirect?: boolean;
		} = {
			noRedirect: false
		}
	) =>
	async (req: Request, res: Response, next: NextFunction) => {
		const authHeader = req.headers.authorization + '';

		const token = authHeader.split(' ').at(-1);

		if (token) {
			const userId = verifyToken(token);
			if (userId) {
				req.userId = userId;
			}
		}

		if (!req.userId && !noRedirect) {
			return res.status(401).json({ error: 'not signed in' });
		}

		next();
	};
