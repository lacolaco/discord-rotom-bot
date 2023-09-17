/**
 * @see https://v13.discordjs.guide/miscellaneous/parsing-mention-arguments.html#how-discord-mentions-work
 * @param roleID
 * @returns
 */
export function roleMention(roleID: string) {
  return `<@&${roleID}>`;
}
