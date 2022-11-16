import 'dotenv/config';

import { Client, Events, GatewayIntentBits, Routes } from 'discord.js';
import express from 'express';
import { chatInputCommands } from './commands';

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

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }
  const command = chatInputCommands[interaction.commandName];
  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }
  console.log(`Command: ${interaction.commandName}`);

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    interaction
      .reply({ content: 'There was an error while executing this command!', ephemeral: true })
      .catch((error) => console.error(error));
  }
});

export async function registerGuildCommands(appId: string, guildId: string) {
  console.log(`Installing commands...`);
  const commands = Object.values(chatInputCommands).map((command) => command.data.toJSON());
  await client.rest.put(Routes.applicationGuildCommands(appId, guildId), {
    body: commands,
  });
}

const app = express();

app.get('/', async (req, res) => {
  res.status(200).send('OK');
});

app.get('/prepare', async (req, res) => {
  try {
    await registerGuildCommands(APP_ID, GUILD_ID);
    res.send('OK');
  } catch (e) {
    console.error(e);
    res.status(500).send('ERROR');
  }
});

app.listen(PORT, () => {
  console.log(`Listening on ${PORT}`);

  client.login(DISCORD_TOKEN);
});
