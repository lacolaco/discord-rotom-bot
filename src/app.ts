import 'dotenv/config';
import express from 'express';
import { Client, Events, GatewayIntentBits } from 'discord.js';

const PORT = process.env.PORT || 3000;
const APP_ID = process.env.APP_ID;
const PUBLIC_KEY = process.env.PUBLIC_KEY;
const GUILD_ID = process.env.GUILD_ID;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

if (!APP_ID || !PUBLIC_KEY || !GUILD_ID || !DISCORD_TOKEN) {
  throw new Error('Missing environment variables');
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

express().listen(PORT, () => {
  console.log(`Listening on ${PORT}`);

  client.login(DISCORD_TOKEN);
});
