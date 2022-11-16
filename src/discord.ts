import { Client, Events, GatewayIntentBits } from 'discord.js';
import { getChatInputCommand, registerGuildCommands } from './commands';

export async function bootstrapDiscordApp(
  token: string,
  appID: string,
  guildID: string,
) {
  const client = createClient();
  await client.login(token);
  await registerGuildCommands(client, appID, guildID);

  return () => {
    client.destroy();
  };
}

function createClient(): Client {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.once(Events.ClientReady, (c) => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) {
      return;
    }
    const command = getChatInputCommand(interaction.commandName);
    if (!command) {
      console.error(
        `No command matching ${interaction.commandName} was found.`,
      );
      return;
    }
    console.log(`Command: ${interaction.commandName}`);

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      interaction
        .reply({
          content: 'There was an error while executing this command!',
          ephemeral: true,
        })
        .catch((error) => console.error(error));
    }
  });
  return client;
}
