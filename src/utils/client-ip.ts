import { BlockList, isIP } from 'net';
import type { Request } from 'express';

// Traffic reaches this process as Cloudflare -> nginx -> 127.0.0.1. With `trust proxy` set to
// loopback, req.ip is the address nginx saw, which is a Cloudflare edge for every normal request.
// Cloudflare puts the real visitor in CF-Connecting-IP; that header is only trusted when the
// request actually came from a Cloudflare edge, because the origin is also reachable directly and
// anyone can send the header themselves.
// Ranges: https://www.cloudflare.com/ips/ (checked 2026-09-29).
const CLOUDFLARE_RANGES = [
	'173.245.48.0/20',
	'103.21.244.0/22',
	'103.22.200.0/22',
	'103.31.4.0/22',
	'141.101.64.0/18',
	'108.162.192.0/18',
	'190.93.240.0/20',
	'188.114.96.0/20',
	'197.234.240.0/22',
	'198.41.128.0/17',
	'162.158.0.0/15',
	'104.16.0.0/13',
	'104.24.0.0/14',
	'172.64.0.0/13',
	'131.0.72.0/22',
	'2400:cb00::/32',
	'2606:4700::/32',
	'2803:f800::/32',
	'2405:b500::/32',
	'2405:8100::/32',
	'2a06:98c0::/29',
	'2c0f:f248::/32'
];

const cloudflare = new BlockList();
for (const range of CLOUDFLARE_RANGES) {
	const [network, prefix] = range.split('/');
	cloudflare.addSubnet(network, Number(prefix), isIP(network) === 6 ? 'ipv6' : 'ipv4');
}

function normalize(ip: string) {
	return ip.startsWith('::ffff:') && isIP(ip.slice(7)) === 4 ? ip.slice(7) : ip;
}

function isCloudflare(ip: string) {
	const family = isIP(ip);
	if (!family) return false;
	return cloudflare.check(ip, family === 6 ? 'ipv6' : 'ipv4');
}

export function getClientIp(req: Request) {
	const peer = normalize(req.ip || req.socket.remoteAddress || '');

	if (isCloudflare(peer)) {
		const header = req.headers['cf-connecting-ip'];
		const connectingIp = (Array.isArray(header) ? header[0] : header)?.trim();
		if (connectingIp && isIP(connectingIp)) return normalize(connectingIp);
	}

	return peer || 'unknown';
}
