import dns from 'dns';
import http from 'http';
import https from 'https';
import net, { BlockList } from 'net';
import os from 'os';

// Server-side fetching of user-supplied URLs. Only public http(s) addresses are allowed: every
// address a hostname resolves to is checked at connect time (so DNS rebinding cannot swap in a
// private address after the check), redirects are followed manually and re-checked, and the whole
// request has a deadline and a size cap.

const blockedV4 = [
	'0.0.0.0/8',
	'10.0.0.0/8',
	'100.64.0.0/10', // carrier-grade NAT
	'127.0.0.0/8',
	'169.254.0.0/16', // link-local, including cloud metadata at 169.254.169.254
	'172.16.0.0/12',
	'192.0.0.0/24',
	'192.0.2.0/24',
	'192.88.99.0/24',
	'192.168.0.0/16',
	'198.18.0.0/15',
	'198.51.100.0/24',
	'203.0.113.0/24',
	'224.0.0.0/4',
	'240.0.0.0/4'
];

// IPv6 must be global unicast (2000::/3) and outside these ranges, several of which embed an IPv4
// address. Loopback, unspecified, IPv4-mapped, unique-local, link-local and multicast addresses all
// fall outside 2000::/3.
const blockedV6 = [
	'2001::/32', // Teredo
	'2001:db8::/32',
	'2002::/16' // 6to4
];

const blocked = new BlockList();
for (const range of blockedV4) {
	const [network, prefix] = range.split('/');
	blocked.addSubnet(network, Number(prefix), 'ipv4');
}
for (const range of blockedV6) {
	const [network, prefix] = range.split('/');
	blocked.addSubnet(network, Number(prefix), 'ipv6');
}

const globalV6 = new BlockList();
globalV6.addSubnet('2000::', 3, 'ipv6');

// The droplet's public address sits on a local interface, so services bound to all interfaces are
// reachable through it from this host even though the firewall blocks them from outside.
function localAddresses() {
	const addresses = new Set<string>();
	for (const entries of Object.values(os.networkInterfaces())) {
		for (const entry of entries || []) addresses.add(entry.address.split('%')[0].toLowerCase());
	}
	return addresses;
}

export function isPublicAddress(address: string) {
	const ip = address.split('%')[0].toLowerCase();
	const family = net.isIP(ip);

	if (family === 4) return !blocked.check(ip, 'ipv4') && !localAddresses().has(ip);
	if (family === 6) {
		return globalV6.check(ip, 'ipv6') && !blocked.check(ip, 'ipv6') && !localAddresses().has(ip);
	}
	return false;
}

export class SafeFetchError extends Error {
	constructor(
		message: string,
		readonly status: number
	) {
		super(message);
	}
}

const BLOCKED_MESSAGE = 'That address is not allowed.';

function stripBrackets(hostname: string) {
	return hostname.replace(/^\[|\]$/g, '');
}

/** Parses and checks a URL without connecting. Throws SafeFetchError. */
export function parsePublicUrl(value: string) {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new SafeFetchError('Invalid URL', 400);
	}

	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		throw new SafeFetchError('Only HTTP and HTTPS URLs are allowed', 400);
	}

	const host = stripBrackets(url.hostname);
	if (!host) throw new SafeFetchError('Invalid URL', 400);
	if (net.isIP(host) && !isPublicAddress(host)) throw new SafeFetchError(BLOCKED_MESSAGE, 400);

	return url;
}

/** Resolves a hostname and reports whether every address it resolves to is public. */
export async function resolvesToPublicAddresses(hostname: string) {
	const host = stripBrackets(hostname);
	if (net.isIP(host)) return isPublicAddress(host);

	try {
		const addresses = await dns.promises.lookup(host, { all: true });
		return addresses.length > 0 && addresses.every(({ address }) => isPublicAddress(address));
	} catch {
		return false;
	}
}

// Used as the connect-time lookup, so the address that is checked is the one that is dialled.
const publicLookup: net.LookupFunction = (hostname, options, callback) => {
	dns.lookup(hostname, { ...options, all: true }, (error, addresses) => {
		if (error) return (callback as any)(error);

		const list = addresses as dns.LookupAddress[];
		if (list.length === 0 || !list.every(({ address }) => isPublicAddress(address))) {
			return (callback as any)(new SafeFetchError(BLOCKED_MESSAGE, 400));
		}

		if (options.all) return (callback as any)(null, list);
		(callback as any)(null, list[0].address, list[0].family);
	});
};

export type SafeFetchResult = {
	status: number;
	statusText: string;
	headers: http.IncomingHttpHeaders;
	contentType: string;
	body: Buffer;
	url: string;
};

function requestOnce(url: URL, headers: Record<string, string>, signal: AbortSignal) {
	return new Promise<http.IncomingMessage>((resolve, reject) => {
		const client = url.protocol === 'https:' ? https : http;
		const request = client.request(url, {
			method: 'GET',
			headers,
			lookup: publicLookup,
			signal,
			agent: false
		});
		request.on('response', resolve);
		request.on('error', reject);
		request.end();
	});
}

function readBody(response: http.IncomingMessage, maxBytes: number) {
	return new Promise<Buffer>((resolve, reject) => {
		const declared = Number(response.headers['content-length']);
		if (Number.isFinite(declared) && declared > maxBytes) {
			reject(new SafeFetchError('The file is too large.', 413));
			return response.destroy();
		}

		const chunks: Buffer[] = [];
		let total = 0;
		response.on('data', (chunk: Buffer) => {
			total += chunk.length;
			if (total > maxBytes) {
				reject(new SafeFetchError('The file is too large.', 413));
				response.destroy();
				return;
			}
			chunks.push(chunk);
		});
		response.on('end', () => resolve(Buffer.concat(chunks)));
		response.on('error', reject);
		response.on('aborted', () => reject(new SafeFetchError('The download was interrupted.', 502)));
	});
}

export async function safeFetch(
	input: string,
	{
		maxBytes = 15 * 1024 * 1024,
		timeoutMs = 10_000,
		maxRedirects = 5,
		headers = {}
	}: {
		maxBytes?: number;
		timeoutMs?: number;
		maxRedirects?: number;
		headers?: Record<string, string>;
	} = {}
): Promise<SafeFetchResult> {
	const signal = AbortSignal.timeout(timeoutMs);
	let url = parsePublicUrl(input);

	try {
		for (let redirects = 0; ; redirects++) {
			const response = await requestOnce(url, headers, signal);
			const status = response.statusCode || 0;
			const location = response.headers.location;

			if (status >= 300 && status < 400 && location) {
				response.resume();
				if (redirects >= maxRedirects) throw new SafeFetchError('Too many redirects.', 502);
				url = parsePublicUrl(new URL(location, url).toString());
				continue;
			}

			const body = await readBody(response, maxBytes);
			return {
				status,
				statusText: response.statusMessage || '',
				headers: response.headers,
				contentType: (response.headers['content-type'] || '').toString(),
				body,
				url: url.toString()
			};
		}
	} catch (error) {
		if (error instanceof SafeFetchError) throw error;
		if (signal.aborted) throw new SafeFetchError('The request timed out.', 504);
		throw new SafeFetchError('Could not fetch that URL.', 502);
	}
}
