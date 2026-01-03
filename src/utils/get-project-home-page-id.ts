import { Project, TilePage, TilePageInProject } from '@prisma/client';
import prisma from '@/resources/prisma';

export async function GetProjectHomePageID(
	project: Project & {
		connectedPages: (TilePageInProject & {
			tilePage: TilePage;
		})[];
	}
) {
	const homePageId =
		project?.connectedPages.find(
			(connectedPage) => connectedPage.tilePage.name.toLowerCase().trim() === 'home'
		)?.tilePageId || project?.connectedPages[0]?.tilePageId;

	return homePageId + '';
}

// Lightweight version that queries only what's needed
export async function GetProjectHomePageIDByProjectId(projectId: string): Promise<string> {
	const homePage = await prisma.tilePageInProject.findFirst({
		where: {
			projectId,
			tilePage: {
				name: { equals: 'home', mode: 'insensitive' }
			}
		},
		select: { tilePageId: true }
	});

	if (homePage) return homePage.tilePageId;

	// Fallback to first page if no "Home" page exists
	const firstPage = await prisma.tilePageInProject.findFirst({
		where: { projectId },
		select: { tilePageId: true },
		orderBy: { createdAt: 'asc' }
	});

	return firstPage?.tilePageId || '';
}
