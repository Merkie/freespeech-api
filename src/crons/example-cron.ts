import cron from 'node-cron';

const ExampleCron = {
	start: startExampleCron
};

export default ExampleCron;

let isRunning = false;

async function startExampleCron() {
	cron.schedule('*/5 * * * * *', async () => {
		if (isRunning) return;

		isRunning = true;

		console.log(`[Example Cron] Tick!`);

		isRunning = false;
	});
}
