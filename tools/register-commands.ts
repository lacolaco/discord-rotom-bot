import { RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord-api-types/v10';
import ping from '../src/commands/ping';
import pokeinfo from '../src/commands/pokeinfo';
import DiscordClient from '../src/discord/api';

const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [
  ping,
  pokeinfo,
];

async function main() {
  const discodeToken = process.env.DISCORD_TOKEN;
  const applicationId = process.env.DISCORD_APPLICATION_ID;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!discodeToken || !applicationId || !guildId) {
    throw new Error('Missing environment variables');
  }

  console.log(`Installing commands: ${commands.map((c) => c.name).join(', ')}`);
  const discord = new DiscordClient(discodeToken);
  await discord.putGuildApplicationCommands(applicationId, guildId, commands);
  console.log(`Done`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
