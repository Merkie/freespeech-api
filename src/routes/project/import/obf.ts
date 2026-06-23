import type { Request, Response } from 'express';
import { OBFPage } from '@/utils/open-board-format-types';
import { authenticateRequest } from '@/middleware/authenticate-request';
import prisma from '@/resources/prisma';

export const POST = [
	authenticateRequest(),
	async (req: Request, res: Response) => {
		const page = req.body as OBFPage;

		const name = page.name;
		const columns = page.grid.columns;
		const rows = page.grid.rows;

		if (!name || !columns || !rows) return res.status(400).json({ error: 'Invalid request body' });

		const createdProject = await prisma.project.create({
			data: {
				name,
				description: '',
				isPublic: false,
				columns,
				rows,
				userId: req.userId!
			}
		});
		if (!createdProject) return res.status(500).json({ error: 'Failed to create project' });

		const createdHomepage = await prisma.tilePage.create({
			data: {
				name: 'Home',
				userId: req.userId!
			}
		});
		if (!createdHomepage) return res.status(500).json({ error: 'Failed to create tile page' });

		await prisma.tilePageInProject.create({
			data: {
				projectId: createdProject.id,
				tilePageId: createdHomepage.id
			}
		});

		await prisma.tile.createMany({
			data: page.grid.order
				.map((row, rowIndex) => {
					return row.map((item, itemIndex) => {
						if (!item) return;

						const obfButton = page.buttons.find((button) => button.id === item);
						if (!obfButton) return;

						const image = page.images.find((image) => image.id === obfButton.image_id)?.url || '';

						return {
							x: itemIndex,
							y: rowIndex,
							page: 0,
							text: obfButton.label || '',
							backgroundColor: obfButton.background_color || '',
							borderColor: obfButton.border_color || '',
							image,
							tilePageId: createdHomepage.id
						};
					});
				})
				.flat() as {
				x: number;
				y: number;
				page: number;
				text: string;
				image: string;
				tilePageId: string;
			}[]
		});

		return res.json({ success: true, projectId: createdProject.id });
	}
];
