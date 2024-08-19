import dotenv from 'dotenv';
dotenv.config();

export const PORT = process.env.PORT + '';
export const JWT_SECRET = process.env.JWT_SECRET + '';
export const SITE_SECRET = process.env.SITE_SECRET + '';
export const CLIENT_HOST = process.env.CLIENT_HOST + '';
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID + '';
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET + '';
export const BING_IMAGE_SEARCH_KEY = process.env.BING_IMAGE_SEARCH_KEY + '';
export const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID + '';
export const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY + '';
export const R2_SECRET_KEY = process.env.R2_SECRET_KEY + '';

export function init() {
	if (PORT.length === 0) throw new Error('PORT is not set');
	if (JWT_SECRET.length === 0) throw new Error('JWT_SECRET is not set');
	if (SITE_SECRET.length === 0) throw new Error('SITE_SECRET is not set');
	if (CLIENT_HOST.length === 0) throw new Error('CLIENT_HOST is not set');
	if (GOOGLE_CLIENT_ID.length === 0) throw new Error('GOOGLE_CLIENT_ID is not set');
	if (GOOGLE_CLIENT_SECRET.length === 0) throw new Error('GOOGLE_CLIENT_SECRET is not set');
	if (BING_IMAGE_SEARCH_KEY.length === 0) throw new Error('BING_IMAGE_SEARCH_KEY is not set');
	if (R2_ACCOUNT_ID.length === 0) throw new Error('R2_ACCOUNT_ID is not set');
	if (R2_ACCESS_KEY.length === 0) throw new Error('R2_ACCESS_KEY is not set');
	if (R2_SECRET_KEY.length === 0) throw new Error('R2_SECRET_KEY is not set');
}
