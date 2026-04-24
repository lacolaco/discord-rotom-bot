import {
  APIApplicationCommandInteraction,
  APIMessageComponentInteraction,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ComponentType,
  InteractionResponseType,
  InteractionType,
  MessageFlags,
} from 'discord-api-types/v10';
import { describe, expect, test, vi } from 'vitest';
import { createComponentResponse, createResponse } from './pokeinfo';

function buildSlashInteraction(name: string): APIApplicationCommandInteraction {
  return {
    id: '1',
    application_id: 'app',
    token: 'tok',
    version: 1,
    type: InteractionType.ApplicationCommand,
    data: {
      id: 'cmd',
      name: 'pokeinfo',
      type: ApplicationCommandType.ChatInput,
      options: [
        {
          name: 'name',
          type: ApplicationCommandOptionType.String,
          value: name,
        },
      ],
    },
    app_permissions: '0',
    authorizing_integration_owners: {},
    entitlements: [],
    locale: 'ja',
    channel: { id: 'c', type: 0 },
    channel_id: 'c',
    attachment_size_limit: 8388608,
  } as unknown as APIApplicationCommandInteraction;
}

function buildComponentInteraction(
  customId: string,
): APIMessageComponentInteraction {
  return {
    id: '2',
    application_id: 'app',
    token: 'tok',
    version: 1,
    type: InteractionType.MessageComponent,
    data: {
      custom_id: customId,
      component_type: ComponentType.Button,
    },
    message: {},
    app_permissions: '0',
    authorizing_integration_owners: {},
    entitlements: [],
    locale: 'ja',
    channel: { id: 'c', type: 0 },
    channel_id: 'c',
    attachment_size_limit: 8388608,
  } as unknown as APIMessageComponentInteraction;
}

describe('createResponse', () => {
  test('known pokemon returns ephemeral embed with share button', async () => {
    const res = await createResponse(buildSlashInteraction('ピカチュウ'));
    expect(res).not.toBeNull();
    expect(res!.type).toBe(InteractionResponseType.ChannelMessageWithSource);
    const data = (res as { data: Record<string, unknown> }).data;
    expect(data.flags).toBe(MessageFlags.Ephemeral);
    expect(Array.isArray(data.embeds)).toBe(true);
    const components = data.components as Array<{
      components: Array<{ custom_id: string; label: string }>;
    }>;
    expect(components).toHaveLength(1);
    const button = components[0]!.components[0]!;
    expect(button.custom_id).toBe('pokeinfo:share:ピカチュウ');
    expect(button.label).toBe('チャンネルにシェア');
  });

  test('unknown pokemon returns ephemeral text without button', async () => {
    const res = await createResponse(buildSlashInteraction('__nope__'));
    expect(res).not.toBeNull();
    const data = (res as { data: Record<string, unknown> }).data;
    expect(data.flags).toBe(MessageFlags.Ephemeral);
    expect(data.components).toBeUndefined();
    expect(data.content).toContain('見つからなかった');
  });
});

describe('createComponentResponse', () => {
  test('share button updates ephemeral and posts public followup', async () => {
    const res = await createComponentResponse(
      buildComponentInteraction('pokeinfo:share:ピカチュウ'),
    );
    expect(res).not.toBeNull();
    expect(res!.response.type).toBe(InteractionResponseType.UpdateMessage);
    const data = (res!.response as { data: Record<string, unknown> }).data;
    expect(data.components).toEqual([]);
    expect(data.embeds).toEqual([]);
    expect(data.content).toBeDefined();

    expect(res!.followup).toBeDefined();
    const postInteractionFollowup = vi.fn<
      (
        appId: string,
        token: string,
        body: { embeds: unknown[] },
      ) => Promise<Response>
    >(async () => new Response('{}'));
    const patchOriginalInteractionResponse = vi.fn<
      (appId: string, token: string, body: unknown) => Promise<Response>
    >(async () => new Response('{}'));
    await res!.followup!({
      applicationId: 'app',
      interactionToken: 'tok',
      discord: {
        postInteractionFollowup,
        patchOriginalInteractionResponse,
      } as never,
    });
    expect(postInteractionFollowup).toHaveBeenCalledTimes(1);
    const [appId, token, body] = postInteractionFollowup.mock.calls[0]!;
    expect(appId).toBe('app');
    expect(token).toBe('tok');
    expect(body.embeds).toHaveLength(1);
    expect(patchOriginalInteractionResponse).not.toHaveBeenCalled();
  });

  test('share action with unknown pokemon returns UpdateMessage with not-found', async () => {
    const res = await createComponentResponse(
      buildComponentInteraction('pokeinfo:share:__nope__'),
    );
    expect(res).not.toBeNull();
    expect(res!.response.type).toBe(InteractionResponseType.UpdateMessage);
    expect(res!.followup).toBeUndefined();
  });

  test('followup failure rolls back ephemeral via PATCH original', async () => {
    const res = await createComponentResponse(
      buildComponentInteraction('pokeinfo:share:ピカチュウ'),
    );
    const postInteractionFollowup = vi.fn<
      (appId: string, token: string, body: unknown) => Promise<Response>
    >(async () => {
      throw new Error('boom');
    });
    const patchOriginalInteractionResponse = vi.fn<
      (appId: string, token: string, body: unknown) => Promise<Response>
    >(async () => new Response('{}'));
    await expect(
      res!.followup!({
        applicationId: 'app',
        interactionToken: 'tok',
        discord: {
          postInteractionFollowup,
          patchOriginalInteractionResponse,
        } as never,
      }),
    ).rejects.toThrow('boom');
    expect(patchOriginalInteractionResponse).toHaveBeenCalledTimes(1);
  });

  test('unknown action returns null', async () => {
    const res = await createComponentResponse(
      buildComponentInteraction('pokeinfo:unknown:foo'),
    );
    expect(res).toBeNull();
  });

  test('name containing colon is preserved via rest join', async () => {
    const res = await createComponentResponse(
      buildComponentInteraction('pokeinfo:share:ア:イ'),
    );
    expect(res).not.toBeNull();
    const data = (res!.response as { data: Record<string, unknown> }).data;
    expect(data.content).toContain('"ア:イ"');
  });
});
