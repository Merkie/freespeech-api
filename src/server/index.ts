import dotenv from 'dotenv';
dotenv.config();

import { elevenlabsRouter } from './routers/elevenlabs';
import express from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.get('/', function (req, res) {
	res.send('Hello World!');
});

app.use('/elevenlabs', elevenlabsRouter);

app.listen(port, async () => {
	console.log(`FreeSpeech Server running at http://localhost:${port}`);
});
