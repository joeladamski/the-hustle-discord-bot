async function onGuildMemberAdd(member, context) {
  const { dbApi, logger, welcomeChannelName, logChannelName } = context;

  const autoRoleName = await dbApi.getAutoRoleName();
  const welcomeTemplate = await dbApi.getWelcomeMessage();

  const role = member.guild.roles.cache.find((r) => r.name === autoRoleName);

  if (!role) {
    logger.warn(`[JOIN] Role not found: ${autoRoleName}. User: ${member.user.tag}`);
  } else {
    try {
      await member.roles.add(role);
      logger.info(`[JOIN] Assigned role "${autoRoleName}" to ${member.user.tag}`);
    } catch (error) {
      logger.error(`[JOIN] Failed to assign role "${autoRoleName}" to ${member.user.tag}: ${error.message}`);
    }
  }

  const welcomeChannel = member.guild.channels.cache.find(
    (c) => c.name === welcomeChannelName && c.isTextBased()
  );

  const logChannel = member.guild.channels.cache.find(
    (c) => c.name === logChannelName && c.isTextBased()
  );

  const renderedWelcome = welcomeTemplate
    .replaceAll('{user}', `<@${member.user.id}>`)
    .replaceAll('{server}', member.guild.name)
    .replaceAll('{role}', autoRoleName);

  if (welcomeChannel) {
    await welcomeChannel.send(renderedWelcome);
  } else {
    logger.warn(`[JOIN] Welcome channel not found: ${welcomeChannelName}`);
  }

  const logMessage = `[JOIN] ${member.user.tag} (${member.user.id}) joined ${member.guild.name} and target role is ${autoRoleName}`;

  if (logChannel) {
    await logChannel.send(logMessage);
  }

  logger.info(logMessage);
}

module.exports = {
  onGuildMemberAdd
};
