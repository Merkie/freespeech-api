import type { Request, Response } from 'express';
import { OBFPage } from '@/utils/open-board-format-types';
import { authenticateRequest } from '@/middleware/authenticate-request';
import prisma from '@/resources/prisma';

export const POST = [
	authenticateRequest(),
	async (req: Request, res: Response) => {
		const body = req.body as {
			obfFiles: {
				fileName: string;
				data: OBFPage;
			}[];
			manifest: { root: string };
		};

		const { obfFiles, manifest } = body;

		const rootFile = obfFiles.find((file) => file.fileName === manifest.root);
		if (!rootFile) return res.status(400).json({ error: 'Root file not found' });

		const createdProject = await prisma.project.create({
			data: {
				name: rootFile.data.name,
				description: '',
				isPublic: false,
				columns: rootFile.data.grid.columns,
				rows: rootFile.data.grid.rows,
				userId: req.userId!
			}
		});

		if (!createdProject) return res.status(500).json({ error: 'Failed to create project' });

		const obzIDToPrismaID = new Map<string, string>();

		for await (const file of obfFiles) {
			console.log(`Creating page ${file.fileName}`);
			const createdTilePage = await prisma.tilePage.create({
				data: {
					name: file.fileName === manifest.root ? 'Home' : file.data.name,
					userId: req.userId!
				}
			});
			if (!createdTilePage) return res.status(500).json({ error: 'Failed to create tile page' });

			await prisma.tilePageInProject.create({
				data: {
					projectId: createdProject.id,
					tilePageId: createdTilePage.id
				}
			});

			obzIDToPrismaID.set(file.data.id, createdTilePage.id);
		}

		for await (const file of obfFiles) {
			await prisma.tile.createMany({
				data: file.data.grid.order
					.map((row, rowIndex) => {
						return row.map((item, itemIndex) => {
							if (!item) return;

							const obfButton = file.data.buttons.find((button) => button.id === item);
							if (!obfButton) return;

							const image =
								file.data.images.find((image) => image.id === obfButton.image_id)?.url || '';

							return {
								x: itemIndex,
								y: rowIndex,
								page: 0,
								text: obfButton.label || '',
								backgroundColor: obfButton.background_color || '',
								borderColor: obfButton.border_color || '',
								image,
								tilePageId: obzIDToPrismaID.get(file.data.id) || '',
								navigation: obfButton.load_board ? obzIDToPrismaID.get(obfButton.load_board.id) : ''
							};
						});
					})
					.flat()
					.filter((tile) => tile && tile.tilePageId) as {
					x: number;
					y: number;
					page: number;
					text: string;
					image: string;
					tilePageId: string;
					navigation: string;
				}[]
			});
		}

		return res.json({ success: true });
	}
];

// import type { OBFPage } from '$ts/common/openboardformat';
// import { json } from '@sveltejs/kit';

// export const POST = async ({ request, locals: { user, prisma } }) => {

// 	return json({ success: true });
// };