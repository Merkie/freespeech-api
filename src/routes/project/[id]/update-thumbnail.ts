import { authenticateRequest } from '@/middleware/authenticate-request';
import prisma from '@/resources/prisma';
import s3 from '@/resources/s3';
import { CLIENT_HOST, R2_BUCKET } from '@/utils/env';
import { GetProjectHomePageID } from '@/utils/get-project-home-page-id';
import slugify from '@/utils/slugify';
import { generateToken } from '@/utils/token';
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import type { Request, Response } from 'express';
import puppeteer, { type Browser } from 'puppeteer';

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

export async function getThumbnail(
	userId: string,
	projectId: string,
	pageId: string,
	fileName: string
) {
	const browser = await getBrowserInstance();
	const page = await browser.newPage();

	// Set the cookies
	await page.setCookie({
		name: 'token',
		value: generateToken(userId).token,
		domain: new URL(CLIENT_HOST).hostname,
		path: '/'
	});

	await page.goto(`${CLIENT_HOST}/app/project/${projectId}/${pageId}/thumbnail`);
	await page.waitForNetworkIdle();

	const screenshotBuffer = await page.screenshot({ type: 'png' });

	await page.close();

	const file = new File([screenshotBuffer], fileName, { type: 'image/png' });

	return file;
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

		const fileName = `${Date.now()}-thumbnail.png`;

		const file = await getThumbnail(project.userId, project.id, homePageId, fileName);

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
