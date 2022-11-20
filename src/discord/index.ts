import { Client, Events, GatewayIntentBits } from 'discord.js';
import { getCommand, registerGuildCommands } from './commands';

export interface DiscordApp {
  start(): Promise<void>;
  dispose(): Promise<void>;
}

export function createDiscordApp(
  token: string,
  appID: string,
  guildID: string,
): DiscordApp {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  setupEventListeners(client);
  return {
    start: async (): Promise<void> => {
      await client.login(token);
      await registerGuildCommands(client, appID, guildID);
    },
    dispose: async () => {
      return new Promise((resolve) => {
        client.once('disconnect', resolve);
        client.destroy();
      });
    },
  };
}

function setupEventListeners(client: Client): void {
  client.on(Events.ClientReady, (c) => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isCommand()) {
      return;
    }
    const command = getCommand(interaction.commandName);
    if (!command || !command.accept(interaction)) {
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
