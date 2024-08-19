import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './env';

export function generateToken(userId: string) {
	const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '30d' });

	return {
		token
	};
}

export function verifyToken(token: string) {
	let userId = '';

	try {
		let payload = jwt.verify(token, JWT_SECRET);
		userId = (payload as { id: string }).id || '';
	} catch {}

	if (!userId) return null;

	return userId;
}
