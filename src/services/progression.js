function getRoleByLevel(progressionRoles, level) {
  return progressionRoles.find((role) => role.level === level) || null;
}

function getEligibleRoleLevel(progressionRoles, messageCount) {
  if (!progressionRoles.length) {
    return 1;
  }

  const eligibleRole = progressionRoles
    .filter((role) => messageCount >= role.minMessages)
    .sort((a, b) => b.level - a.level)[0];

  return eligibleRole ? eligibleRole.level : progressionRoles[0].level;
}

async function assignProgressionRole(member, progressionRoles, targetLevel, logger) {
  const targetRoleConfig = getRoleByLevel(progressionRoles, targetLevel);

  if (!targetRoleConfig) {
    throw new Error(`No progression role config found for level ${targetLevel}`);
  }

  const targetRole = member.guild.roles.cache.find((role) => role.name === targetRoleConfig.name);
  if (!targetRole) {
    throw new Error(`Discord role not found for progression level ${targetLevel}: ${targetRoleConfig.name}`);
  }

  const configuredRoleNames = progressionRoles.map((role) => role.name);
  const rolesToRemove = member.roles.cache.filter(
    (role) => configuredRoleNames.includes(role.name) && role.id !== targetRole.id
  );

  if (rolesToRemove.size) {
    await member.roles.remove([...rolesToRemove.values()]);
  }

  if (!member.roles.cache.has(targetRole.id)) {
    await member.roles.add(targetRole);
    logger.info(`[PROGRESSION] Assigned role "${targetRole.name}" to ${member.user.tag}`);
  }

  return targetRoleConfig;
}

async function announcePromotion({ guild, promotionLogChannelName, message }) {
  const promotionLogChannel = guild.channels.cache.find(
    (channel) => channel.name === promotionLogChannelName && channel.isTextBased()
  );

  if (promotionLogChannel) {
    await promotionLogChannel.send(message);
  }
}

async function evaluateAndApplyPromotion(member, stats, context) {
  const {
    progressionRoles,
    dbApi,
    logger,
    promotionLogChannelName,
    reason = 'automatic'
  } = context;

  const currentLevel = stats?.roleLevel || progressionRoles[0]?.level || 1;
  const messageCount = stats?.messageCount || 0;
  const eligibleLevel = getEligibleRoleLevel(progressionRoles, messageCount);

  if (eligibleLevel <= currentLevel) {
    return null;
  }

  const assignedRole = await assignProgressionRole(member, progressionRoles, eligibleLevel, logger);
  await dbApi.setRoleLevel(member.user.id, eligibleLevel, member.user.tag);

  const promotionMessage =
    `🎤 ${member.user} promoted to **${assignedRole.name}** ` +
    `(Level ${eligibleLevel}) at **${messageCount}** messages (${reason}).`;

  logger.info(
    `[PROGRESSION] ${member.user.tag} promoted from level ${currentLevel} to level ${eligibleLevel} ` +
    `at ${messageCount} messages (${reason})`
  );

  await announcePromotion({
    guild: member.guild,
    promotionLogChannelName,
    message: promotionMessage
  });

  return {
    previousLevel: currentLevel,
    newLevel: eligibleLevel,
    assignedRole
  };
}

module.exports = {
  getRoleByLevel,
  getEligibleRoleLevel,
  assignProgressionRole,
  evaluateAndApplyPromotion
};
