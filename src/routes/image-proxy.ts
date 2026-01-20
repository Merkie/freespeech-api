import type { Request, Response } from 'express';

export const GET = [
	async (req: Request, res: Response) => {
		try {
			const imageUrl = req.query.url as string;

			if (!imageUrl) {
				return res.status(400).json({
					success: false,
					error: "Missing 'url' query parameter"
				});
			}

			// Validate URL
			let parsedUrl: URL;
			try {
				parsedUrl = new URL(imageUrl);
			} catch {
				return res.status(400).json({
					success: false,
					error: 'Invalid URL'
				});
			}

			// Only allow http/https protocols
			if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
				return res.status(400).json({
					success: false,
					error: 'Only HTTP and HTTPS URLs are allowed'
				});
			}

			// Fetch the image
			const response = await fetch(imageUrl, {
				headers: {
					'User-Agent': 'FreeSpeech-ImageProxy/1.0'
				},
				signal: AbortSignal.timeout(10000) // 10 second timeout
			});

			if (!response.ok) {
				return res.status(response.status).json({
					success: false,
					error: `Failed to fetch image: ${response.statusText}`
				});
			}

			const contentType = response.headers.get('content-type');

			// Validate it's an image
			if (!contentType?.startsWith('image/')) {
				return res.status(400).json({
					success: false,
					error: 'URL does not point to an image'
				});
			}

			// Get the image data
			const imageBuffer = await response.arrayBuffer();

			// Set appropriate headers
			res.setHeader('Content-Type', contentType);
			res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
			res.setHeader('Access-Control-Allow-Origin', '*');

			// Send the image
			return res.send(Buffer.from(imageBuffer));
		} catch (error) {
			console.error('Error proxying image:', error);
			return res.status(500).json({
				success: false,
				error: error instanceof Error ? error.message : 'An unknown error occurred'
			});
		}
	}
];
