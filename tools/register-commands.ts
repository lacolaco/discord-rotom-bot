import { commands } from '../src/commands';
import DiscordApi from '../src/discord/api';

async function main() {
  const discodeToken = process.env.DISCORD_TOKEN;
  const applicationId = process.env.DISCORD_APPLICATION_ID;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!discodeToken || !applicationId || !guildId) {
    throw new Error('Missing environment variables');
  }

  console.log(
    `Installing commands: ${commands.map((c) => c.default.name).join(', ')}`,
  );
  const discord = new DiscordApi(discodeToken);
  await discord.putGuildApplicationCommands(
    applicationId,
    guildId,
    commands.map((c) => c.default),
  );
  console.log(`Done`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
