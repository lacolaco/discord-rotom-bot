import { Client, GatewayIntentBits } from 'discord.js';
import { registerGuildCommands } from './commands';

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
