import { SITE_SECRET } from './env';
import Cryptr from 'cryptr';

export function DecryptElevenLabsKey(encKey?: string | undefined | null) {
	let userKey = '';

	if (encKey) {
		const cryptr = new Cryptr(SITE_SECRET);
		userKey = cryptr.decrypt(encKey);
	}

	return userKey;
}
