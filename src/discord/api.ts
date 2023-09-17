import type { MessageCreateOptions } from 'discord.js';

/**
 * @see https://discord.com/developers/docs/resources/channel#create-message
 * @param channelID
 */
export async function sendMessageByWebhook(
  webhookURL: string,
  message: MessageCreateOptions,
) {
  const response = await fetch(webhookURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
  if (!response.ok) {
    throw new Error(
      `Failed to send message to webhook ${webhookURL}: ${response.status} ${response.statusText}`,
    );
  }
}
