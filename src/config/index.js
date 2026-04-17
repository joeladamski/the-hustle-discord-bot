const fs = require('fs');
const path = require('path');

const configPath = path.resolve(__dirname, '../../config/bot.config.json');

const defaultProgressionRoles = [
  { level: 1, name: 'Fresh Ink', minMessages: 0 },
  { level: 2, name: 'Bar Spitter', minMessages: 25 },
  { level: 3, name: 'Mic Controller', minMessages: 75 },
  { level: 4, name: 'Cypher King', minMessages: 200 }
];

function normalizeProgressionRoles(progressionRoles) {
  if (!Array.isArray(progressionRoles) || !progressionRoles.length) {
    return defaultProgressionRoles;
  }

  return progressionRoles
    .map((role, index) => ({
      level: Number.isInteger(role.level) ? role.level : index + 1,
      name: String(role.name || '').trim(),
      minMessages: Number.isInteger(role.minMessages) ? role.minMessages : 0
    }))
    .filter((role) => role.name)
    .sort((a, b) => a.level - b.level);
}

function loadStaticConfig() {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Missing config file at: ${configPath}`);
  }

  const raw = fs.readFileSync(configPath, 'utf8');
  const parsed = JSON.parse(raw);
  const progressionRoles = normalizeProgressionRoles(parsed.progressionRoles);

  return {
    autoRoleName: parsed.autoRoleName || progressionRoles[0].name || 'Fresh Ink',
    welcomeMessage: parsed.welcomeMessage || 'Welcome {user} to {server}!',
    adminRoleName: parsed.adminRoleName || 'Admin',
    promotionLogChannelName: parsed.promotionLogChannelName || 'level-ups',
    progressionRoles
  };
}

module.exports = {
  loadStaticConfig
};
