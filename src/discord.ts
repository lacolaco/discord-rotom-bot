import { Client, Events, GatewayIntentBits } from 'discord.js';
import { getChatInputCommand, registerGuildCommands } from './commands';

export function createDiscordApp() {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  setupEventListeners(client);
  return {
    client,
    bootstrap: async (
      token: string,
      appID: string,
      guildID: string,
    ): Promise<void> => {
      await client.login(token);
      await registerGuildCommands(client, appID, guildID);
    },
    dispose: () => {
      client.destroy();
    },
  };
}

function setupEventListeners(client: Client): void {
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
}
