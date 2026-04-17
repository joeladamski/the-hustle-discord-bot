function runQuery(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this);
    });
  });
}

function allQuery(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows || []);
    });
  });
}

async function ensureUsersTableColumns(db) {
  const columns = await allQuery(db, 'PRAGMA table_info(users)');
  const hasMessageCount = columns.some((column) => column.name === 'message_count');
  const hasActivityCount = columns.some((column) => column.name === 'activity_count');

  if (!hasMessageCount) {
    await runQuery(db, 'ALTER TABLE users ADD COLUMN message_count INTEGER NOT NULL DEFAULT 0');
  }

  // Backfill from legacy schema if present.
  if (hasActivityCount) {
    await runQuery(
      db,
      'UPDATE users SET message_count = CASE WHEN message_count < activity_count THEN activity_count ELSE message_count END'
    );
  }
}

async function initUsersTable(db) {
  await runQuery(
    db,
    `CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      role_level INTEGER NOT NULL DEFAULT 1,
      message_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );

  await ensureUsersTableColumns(db);
}

function upsertUser(db, { userId, username, roleLevel = 1 }) {
  return runQuery(
    db,
    `INSERT INTO users (user_id, username, role_level)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       username = excluded.username,
       role_level = COALESCE(users.role_level, excluded.role_level),
       updated_at = CURRENT_TIMESTAMP`,
    [userId, username, roleLevel]
  );
}

function incrementUserMessageCount(db, { userId, username, roleLevel = 1, amount = 1 }) {
  return runQuery(
    db,
    `INSERT INTO users (user_id, username, role_level, message_count)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       username = excluded.username,
       message_count = users.message_count + excluded.message_count,
       updated_at = CURRENT_TIMESTAMP`,
    [userId, username, roleLevel, amount]
  );
}

function setUserRoleLevel(db, { userId, roleLevel, username }) {
  const safeUsername = username || userId;

  return runQuery(
    db,
    `INSERT INTO users (user_id, username, role_level)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       username = excluded.username,
       role_level = excluded.role_level,
       updated_at = CURRENT_TIMESTAMP`,
    [userId, safeUsername, roleLevel]
  );
}

function getUserStats(db, userId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT user_id AS userId,
              username,
              role_level AS roleLevel,
              message_count AS messageCount,
              created_at AS createdAt,
              updated_at AS updatedAt
       FROM users
       WHERE user_id = ?`,
      [userId],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row || null);
      }
    );
  });
}

function listTopActiveUsers(db, limit = 5) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT user_id AS userId,
              username,
              role_level AS roleLevel,
              message_count AS messageCount
       FROM users
       ORDER BY message_count DESC, updated_at DESC
       LIMIT ?`,
      [limit],
      (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows || []);
      }
    );
  });
}

module.exports = {
  initUsersTable,
  upsertUser,
  incrementUserMessageCount,
  setUserRoleLevel,
  getUserStats,
  listTopActiveUsers
};
