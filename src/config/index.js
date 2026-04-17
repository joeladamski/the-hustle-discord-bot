const fs = require('fs');
const path = require('path');

const configPath = path.resolve(__dirname, '../../config/bot.config.json');

function loadStaticConfig() {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Missing config file at: ${configPath}`);
  }

  const raw = fs.readFileSync(configPath, 'utf8');
  const parsed = JSON.parse(raw);

  return {
    autoRoleName: parsed.autoRoleName || 'Fresh Ink',
    welcomeMessage: parsed.welcomeMessage || 'Welcome {user} to {server}!',
    adminRoleName: parsed.adminRoleName || 'Admin'
  };
}

module.exports = {
  loadStaticConfig
};
