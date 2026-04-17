function initUsersTable(db) {
  return new Promise((resolve, reject) => {
    db.run(
      `CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        role_level INTEGER NOT NULL DEFAULT 1,
        activity_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      }
    );
  });
}

function upsertUser(db, { userId, username, roleLevel = 1 }) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO users (user_id, username, role_level)
       VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         username = excluded.username,
         role_level = COALESCE(users.role_level, excluded.role_level),
         updated_at = CURRENT_TIMESTAMP`,
      [userId, username, roleLevel],
      (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      }
    );
  });
}

function incrementUserActivity(db, { userId, username, roleLevel = 1, amount = 1 }) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO users (user_id, username, role_level, activity_count)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         username = excluded.username,
         activity_count = users.activity_count + excluded.activity_count,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, username, roleLevel, amount],
      (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      }
    );
  });
}

function getUserStats(db, userId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT user_id AS userId,
              username,
              role_level AS roleLevel,
              activity_count AS activityCount,
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
              activity_count AS activityCount
       FROM users
       ORDER BY activity_count DESC, updated_at DESC
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
  incrementUserActivity,
  getUserStats,
  listTopActiveUsers
};
