/**
 * @see https://discord.com/developers/docs/reference#message-formatting
 * @param roleID
 * @returns
 */
export function roleMention<T extends string>(roleID: T): `<@&${T}>` {
  return `<@&${roleID}>`;
}

export function bold<T extends string>(text: T): `**${T}**` {
  return `**${text}**`;
}
