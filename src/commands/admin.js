const { PermissionsBitField } = require('discord.js');
const {
  getRoleByLevel,
  assignProgressionRole
} = require('../services/progression');

async function parseTargetUser(message, rawArg) {
  const mentionedUser = message.mentions.users.first();
  if (mentionedUser) {
    return mentionedUser;
  }

  const userId = rawArg?.replace(/[<@!>]/g, '');
  if (!userId) {
    return null;
  }

  return message.client.users.fetch(userId).catch(() => null);
}

async function handleAdminCommands(message, context) {
  const { prefix, adminRoleName, dbApi, progressionRoles, logger } = context;

  if (!message.content.startsWith(prefix)) {
    return;
  }

  const [rawCommand, ...args] = message.content.slice(prefix.length).trim().split(/\s+/);
  const command = (rawCommand || '').toLowerCase();

  if (!['setwelcome', 'setautorole', 'showconfig', 'userstats', 'topactivity', 'promote', 'demote'].includes(command)) {
    return;
  }

  const isAdminByPermission = message.member.permissions.has(PermissionsBitField.Flags.Administrator);
  const isAdminByRole = message.member.roles.cache.some((role) => role.name === adminRoleName);

  if (!isAdminByPermission && !isAdminByRole) {
    await message.reply('You do not have permission to use admin commands.');
    return;
  }

  if (command === 'showconfig') {
    const role = await dbApi.getAutoRoleName();
    const welcome = await dbApi.getWelcomeMessage();
    const progressionSummary = progressionRoles
      .map((progressionRole) => `${progressionRole.level}:${progressionRole.name}@${progressionRole.minMessages}`)
      .join(' | ');

    await message.reply(
      `Current config:\n- autoRoleName: **${role}**\n- welcomeMessage: ${welcome}\n- progressionRoles: ${progressionSummary}`
    );
    return;
  }

  if (command === 'userstats') {
    const firstMention = message.mentions.users.first();
    const lookupUserId = firstMention?.id || args[0] || message.author.id;
    const stats = await dbApi.fetchUserStats(lookupUserId);

    if (!stats) {
      await message.reply(`No stats found for user ID: ${lookupUserId}`);
      return;
    }

    const currentRole = getRoleByLevel(progressionRoles, stats.roleLevel);
    const nextRole = progressionRoles.find((role) => role.level === stats.roleLevel + 1) || null;

    await message.reply(
      `User stats for **${stats.username}** (${stats.userId}):\n` +
      `- roleLevel: ${stats.roleLevel} (${currentRole?.name || 'Unknown'})\n` +
      `- messageCount: ${stats.messageCount}\n` +
      `- nextRole: ${nextRole ? `${nextRole.name} @ ${nextRole.minMessages}` : 'Max level'}\n` +
      `- createdAt: ${stats.createdAt}\n` +
      `- updatedAt: ${stats.updatedAt}`
    );
    return;
  }

  if (command === 'topactivity') {
    const limit = Math.max(1, Math.min(10, Number.parseInt(args[0], 10) || 5));
    const leaders = await dbApi.fetchTopActiveUsers(limit);

    if (!leaders.length) {
      await message.reply('No user activity has been recorded yet.');
      return;
    }

    const leaderboard = leaders
      .map((entry, index) => `${index + 1}. ${entry.username} (${entry.userId}) - ${entry.messageCount}`)
      .join('\n');

    await message.reply(`Top ${leaders.length} active users by message count:\n${leaderboard}`);
    return;
  }

  if (command === 'promote' || command === 'demote') {
    const targetUser = await parseTargetUser(message, args[0]);
    if (!targetUser) {
      await message.reply(`Usage: ${prefix}${command} <@user|user_id> [target_level]`);
      return;
    }

    const member = await message.guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) {
      await message.reply('Unable to find that user in this server.');
      return;
    }

    const stats = await dbApi.fetchUserStats(targetUser.id);
    const currentLevel = stats?.roleLevel || progressionRoles[0]?.level || 1;
    const minLevel = progressionRoles[0]?.level || 1;
    const maxLevel = progressionRoles[progressionRoles.length - 1]?.level || minLevel;
    const requestedLevel = Number.parseInt(args[1], 10);

    let targetLevel;
    if (Number.isInteger(requestedLevel)) {
      targetLevel = requestedLevel;
    } else {
      targetLevel = command === 'promote' ? currentLevel + 1 : currentLevel - 1;
    }

    targetLevel = Math.max(minLevel, Math.min(maxLevel, targetLevel));

    if (targetLevel === currentLevel) {
      await message.reply(`No change needed. User is already at level ${currentLevel}.`);
      return;
    }

    await assignProgressionRole(member, progressionRoles, targetLevel, logger);
    await dbApi.setRoleLevel(targetUser.id, targetLevel, targetUser.tag);

    const action = command === 'promote' ? 'Promoted' : 'Demoted';
    const targetRole = getRoleByLevel(progressionRoles, targetLevel);
    logger.info(
      `[PROGRESSION][MANUAL] ${message.author.tag} ${action.toLowerCase()} ${targetUser.tag} ` +
      `from level ${currentLevel} to level ${targetLevel}`
    );

    await message.reply(
      `${action} **${targetUser.tag}** from level ${currentLevel} to level ${targetLevel} (${targetRole?.name || 'unknown role'}).`
    );
    return;
  }

  if (command === 'setautorole') {
    const roleName = args.join(' ').trim();
    if (!roleName) {
      await message.reply(`Usage: ${prefix}setautorole <role name>`);
      return;
    }

    await dbApi.setAutoRoleName(roleName);
    await message.reply(`Auto-role updated to **${roleName}**.`);
    return;
  }

  if (command === 'setwelcome') {
    const welcomeMessage = args.join(' ').trim();
    if (!welcomeMessage) {
      await message.reply(`Usage: ${prefix}setwelcome <message>`);
      return;
    }

    await dbApi.setWelcomeMessage(welcomeMessage);
    await message.reply('Welcome message updated.');
  }
}

module.exports = {
  handleAdminCommands
};
