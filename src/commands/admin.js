const { PermissionsBitField } = require('discord.js');

async function handleAdminCommands(message, context) {
  const { prefix, adminRoleName, dbApi } = context;

  if (!message.content.startsWith(prefix)) {
    return;
  }

  const [rawCommand, ...args] = message.content.slice(prefix.length).trim().split(/\s+/);
  const command = (rawCommand || '').toLowerCase();

  if (!['setwelcome', 'setautorole', 'showconfig'].includes(command)) {
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
