import { Project, TilePage, TilePageInProject } from '@prisma/client';

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
