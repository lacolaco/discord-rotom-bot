import {
  Client,
  Events,
  GatewayIntentBits,
  MessageCreateOptions,
} from 'discord.js';
import { getCommand, registerGuildCommands } from './commands';

export interface DiscordApp {
  start(): Promise<void>;
  dispose(): Promise<void>;
  sendMessage(channelId: string, message: MessageCreateOptions): Promise<void>;
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
    sendMessage: async (channelId: string, message: MessageCreateOptions) => {
      const channel = await client.channels.fetch(channelId);
      if (channel && channel.isTextBased()) {
        await channel.send(message);
      }
    },
  };
}

function setupEventListeners(client: Client): void {
  client.on(Events.ClientReady, (c) => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        const command = getCommand(interaction.commandName);
        if (!command) {
          console.error(
            `No command matching ${interaction.toString()} was found.`,
          );
          return;
        }
        console.log(`Command: ${command.data.name}`);
        await command.execute(interaction);
      } else if (interaction.isAutocomplete()) {
        const command = getCommand(interaction.commandName);
        if (!command) {
          console.error(
            `No autocomplete matching ${interaction.commandName} was found.`,
          );
          return;
        }
        console.log(`Command: ${command.data.name}`);
        await command.autocomplete(interaction);
      }
    } catch (error) {
      console.error(error);
    }
  });
}
