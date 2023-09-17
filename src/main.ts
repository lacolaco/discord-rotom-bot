import 'dotenv/config';

import { createDiscordApp } from './discord';
import { startServer } from './server';

const PORT = process.env.PORT || 3000;
const APP_ID = process.env.APP_ID;
const PUBLIC_KEY = process.env.PUBLIC_KEY;
const GUILD_ID = process.env.GUILD_ID;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

if (!APP_ID || !PUBLIC_KEY || !GUILD_ID || !DISCORD_TOKEN) {
  throw new Error('Missing environment variables');
}

const discordApp = createDiscordApp(DISCORD_TOKEN, APP_ID, GUILD_ID);

startServer(PORT)
  .then(async () => {
    await discordApp.start();
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
