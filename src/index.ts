import { init } from './utils/env';
init();
import StartServer from './server/start-server';
import { StartCrons } from './crons';

StartCrons();
StartServer();
