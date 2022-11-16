import 'dotenv/config';
import express from 'express';
import { Client, Events, GatewayIntentBits } from 'discord.js';
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
  console.log(interaction);
  const command = chatInputCommands[interaction.commandName];
  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
  }
});

const app = express();

app.listen(PORT, () => {
  console.log(`Listening on ${PORT}`);

  client.login(DISCORD_TOKEN);
});
