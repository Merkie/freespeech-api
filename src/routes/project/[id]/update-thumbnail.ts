import { authenticateRequest } from '@/middleware/authenticate-request';
import prisma from '@/resources/prisma';
import s3 from '@/resources/s3';
import { CLIENT_HOST, R2_BUCKET } from '@/utils/env';
import { GetProjectHomePageID } from '@/utils/get-project-home-page-id';
import slugify from '@/utils/slugify';
import { generateToken } from '@/utils/token';
import { resolvesToPublicAddresses } from '@/utils/safe-fetch';
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import type { Request, Response } from 'express';
import puppeteer, { type Browser, type Page } from 'puppeteer';

let browserInstance: Browser | null = null;

async function getBrowserInstance() {
	if (!browserInstance) {
		browserInstance = await puppeteer.launch({
			headless: true,
			args: ['--no-sandbox', '--disable-setuid-sandbox'],
			defaultViewport: {
				width: 1280,
				height: 720
			}
		});
	}
	return browserInstance;
}

// The thumbnail page renders tile images from user-supplied URLs inside this server's Chromium, so
// requests to private, loopback or metadata addresses are refused. The app itself (CLIENT_HOST)
// resolves to this server and is allowed by name. Page requests bypass the service worker so every
// request passes through this check.
async function blockPrivateRequests(page: Page) {
	const trustedHost = new URL(CLIENT_HOST).hostname;
	const hostChecks = new Map<string, Promise<boolean>>();

	await page.setBypassServiceWorker(true);
	await page.setRequestInterception(true);

	page.on('request', (request) => {
		if (request.isInterceptResolutionHandled()) return;

		let url: URL;
		try {
			url = new URL(request.url());
		} catch {
			return request.abort('blockedbyclient');
		}

		if (url.protocol === 'data:' || url.protocol === 'blob:') return request.continue();
		if (url.protocol !== 'http:' && url.protocol !== 'https:') {
			return request.abort('blockedbyclient');
		}
		if (url.hostname === trustedHost) return request.continue();

		if (!hostChecks.has(url.hostname)) {
			hostChecks.set(url.hostname, resolvesToPublicAddresses(url.hostname));
		}
		hostChecks
			.get(url.hostname)!
			.then((allowed) => (allowed ? request.continue() : request.abort('blockedbyclient')))
			.catch(() => {});
	});
}

export const POST = [
	authenticateRequest(),
	async (req: Request, res: Response) => {
		const project = await prisma.project.findUnique({
			where: {
				id: req.params.id as string,
				userId: req.userId!
			},
			include: {
				user: true,
				connectedPages: {
					include: {
						tilePage: true
					}
				}
			}
		});
		if (!project) return;

		const homePageId = await GetProjectHomePageID(project);
		if (!homePageId) return res.status(404).json({ error: 'Home page not found' });

		const browser = await getBrowserInstance();
		const page = await browser.newPage();
		await blockPrivateRequests(page);

		// Set the cookies
		await page.setCookie({
			name: 'token',
			value: generateToken(req.userId!).token,
			domain: new URL(CLIENT_HOST).hostname,
			path: '/'
		});

		await page.goto(`${CLIENT_HOST}/app/project/${project.id}/${homePageId}/thumbnail`);
		await page.waitForNetworkIdle();

		const screenshotBuffer = await page.screenshot({ type: 'png' });

		await page.close();

		const fileName = `${Date.now()}-thumbnail.png`;
		const file = new File([screenshotBuffer], fileName, { type: 'image/png' });

		if (project.imageUrl) {
			const deleteCommand = new DeleteObjectCommand({
				Bucket: R2_BUCKET,
				Key: project.imageUrl.split('/').filter(Boolean).join('/')
			});
			await s3.send(deleteCommand);
		}

		const newThumbnailKey = `${slugify(project.user.name)}-${project.user.id}/${fileName}`;

		const fileArrayBuffer = await file.arrayBuffer();
		const fileBuffer = Buffer.from(fileArrayBuffer);

		const uploadCommand = new PutObjectCommand({
			Bucket: R2_BUCKET,
			Key: newThumbnailKey,
			Body: fileBuffer,
			ContentType: 'image/png'
		});
		await s3.send(uploadCommand);

		await prisma.project.update({
			where: {
				id: project.id
			},
			data: {
				imageUrl: '/' + newThumbnailKey
			}
		});

		res.json({ success: true });
	}
];
