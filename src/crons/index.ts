import InvalidateExpiredCache from './invalidate-expired-cache-cron';

export function StartCrons() {
	InvalidateExpiredCache.start();
}
