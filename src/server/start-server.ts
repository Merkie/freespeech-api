import express, { Express } from 'express';
require('express-async-errors');
import cors from 'cors';
import http from 'http';
import { router } from 'express-file-routing';
import HandleErrorMiddleware from '@/middleware/handle-error';
import LogRequestMiddleware from '@/middleware/log-request';
// import { WebsocketServer } from "./websocket/websocket-server";
import { PORT } from '@/utils/env';

export default async function StartServer() {
	const app: Express = express();
	const port = parseInt(PORT);

	app.use(cors());
	app.options('*', cors());

	app.use(express.json({ limit: '100mb' }));

	app.use(LogRequestMiddleware);

	app.use(await router());

	app.use(HandleErrorMiddleware);

	const server = http.createServer(app);

	// server.on("upgrade", async (request, socket, head) => {
	//   const token = request.url?.split("?token=").at(-1);

	//   if (!token) {
	//     socket.destroy();
	//     return;
	//   }

	//   WebsocketServer.handleUpgrade(request, socket, head, (ws) => {
	//     WebsocketServer.emit("connection", ws, request);
	//   });
	// });

	server.listen(port, () => {
		console.log(`[server]: Server is running at http://localhost:${port}`);
	});
}
