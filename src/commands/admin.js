const { PermissionsBitField } = require('discord.js');

async function handleAdminCommands(message, context) {
  const { prefix, adminRoleName, dbApi } = context;

  if (!message.content.startsWith(prefix)) {
    return;
  }

  const [rawCommand, ...args] = message.content.slice(prefix.length).trim().split(/\s+/);
  const command = (rawCommand || '').toLowerCase();

  if (!['setwelcome', 'setautorole', 'showconfig', 'userstats', 'topactivity'].includes(command)) {
    return;
  }

  const isAdminByPermission = message.member.permissions.has(PermissionsBitField.Flags.Administrator);
  const isAdminByRole = message.member.roles.cache.some((r) => r.name === adminRoleName);

  if (!isAdminByPermission && !isAdminByRole) {
    await message.reply('You do not have permission to use admin commands.');
    return;
  }

  if (command === 'showconfig') {
    const role = await dbApi.getAutoRoleName();
    const welcome = await dbApi.getWelcomeMessage();

    await message.reply(
      `Current config:\n- autoRoleName: **${role}**\n- welcomeMessage: ${welcome}`
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

    await message.reply(
      `User stats for **${stats.username}** (${stats.userId}):\n` +
      `- roleLevel: ${stats.roleLevel}\n` +
      `- activityCount: ${stats.activityCount}\n` +
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
      .map((entry, index) => `${index + 1}. ${entry.username} (${entry.userId}) - ${entry.activityCount}`)
      .join('\n');

    await message.reply(`Top ${leaders.length} active users:\n${leaderboard}`);
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
