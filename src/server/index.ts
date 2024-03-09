import dotenv from 'dotenv';
dotenv.config();

import { elevenlabsRouter } from './routers/elevenlabs';
import express from 'express';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.options('*', cors());
app.use(express.json());

app.get('/', function (req, res) {
	res.send('Hello World!');
});

app.use('/elevenlabs', elevenlabsRouter);

app.listen(port, async () => {
	console.log(`FreeSpeech Server running at http://localhost:${port}`);
});
