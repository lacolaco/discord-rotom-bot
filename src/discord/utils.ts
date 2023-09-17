/**
 * @see https://discord.com/developers/docs/reference#message-formatting
 * @param roleID
 * @returns
 */
export function roleMention(roleID: string) {
  return `<@&${roleID}>`;
}
