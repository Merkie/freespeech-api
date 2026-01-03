import prisma from '../src/resources/prisma';

async function backfillHomePageIds() {
	console.log('Starting home page ID backfill...');

	const projects = await prisma.project.findMany({
		where: { homePageId: null },
		include: {
			connectedPages: {
				include: {
					tilePage: true
				}
			}
		}
	});

	console.log(`Found ${projects.length} projects without homePageId`);

	let updated = 0;
	let failed = 0;

	for (const project of projects) {
		// Find the "Home" page (case-insensitive)
		const homePage = project.connectedPages.find(
			(cp) => cp.tilePage.name.toLowerCase().trim() === 'home'
		);

		// Fallback to first page if no "Home" page
		const homePageId = homePage?.tilePageId || project.connectedPages[0]?.tilePageId;

		if (homePageId) {
			await prisma.project.update({
				where: { id: project.id },
				data: { homePageId }
			});
			console.log(`Updated project "${project.name}" (${project.id}) with homePageId: ${homePageId}`);
			updated++;
		} else {
			console.log(`Skipped project "${project.name}" (${project.id}) - no pages found`);
			failed++;
		}
	}

	console.log(`\nBackfill complete: ${updated} updated, ${failed} skipped`);
}

backfillHomePageIds()
	.catch(console.error)
	.finally(() => prisma.$disconnect());
