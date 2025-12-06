import { init } from './utils/env';
init();
import StartServer from './server/start-server';
import { StartCrons } from './crons';
import { fal } from '@fal-ai/client';

fal.config({
	credentials: process.env.FAL_KEY!
});

StartCrons();
StartServer();
