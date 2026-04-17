const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const { initSettingsTable, getSetting, upsertSetting } = require('./settings');
const {
  initUsersTable,
  upsertUser,
  incrementUserMessageCount,
  setUserRoleLevel,
  getUserStats,
  listTopActiveUsers
} = require('./users');

const dbPath = path.resolve(__dirname, '../../data/bot.db');

function createDb() {
  return new sqlite3.Database(dbPath);
}

async function initDb(db) {
  await initSettingsTable(db);
  await initUsersTable(db);
}

module.exports = {
  createDb,
  initDb,
  getSetting,
  upsertSetting,
  upsertUser,
  incrementUserMessageCount,
  setUserRoleLevel,
  getUserStats,
  listTopActiveUsers
};
