function initSettingsTable(db) {
  return new Promise((resolve, reject) => {
    db.run(
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
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

function getSetting(db, key) {
  return new Promise((resolve, reject) => {
    db.get('SELECT value FROM settings WHERE key = ?', [key], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row ? row.value : null);
    });
  });
}

function upsertSetting(db, key, value) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO settings (key, value)
       VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, value],
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

module.exports = {
  initSettingsTable,
  getSetting,
  upsertSetting
};
