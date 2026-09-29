import { RateLimiter } from './rate-limit';

const MINUTE = 60 * 1000;

// Schools put many students behind one NAT address, so the per-IP limits are generous backstops.
// The tight limit is per account email.
export const loginIpLimiter = new RateLimiter(200, 15 * MINUTE);
export const loginFailureLimiter = new RateLimiter(10, 15 * MINUTE);

export const registerIpLimiter = new RateLimiter(60, 60 * MINUTE);

export const forgotPasswordIpLimiter = new RateLimiter(60, 60 * MINUTE);
export const forgotPasswordEmailLimiter = new RateLimiter(5, 60 * MINUTE);

// Wrong-password attempts when confirming account deletion, per user.
export const deleteAccountFailureLimiter = new RateLimiter(10, 15 * MINUTE);
