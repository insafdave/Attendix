const Database = require("better-sqlite3");

const db = new Database("attendix.db");

db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS attendance_records (
    id INTEGER PRIMARY KEY,
    user_id TEXT NOT NULL,
    subject_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    hour INTEGER NOT NULL,
    status TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    UNIQUE (subject_id, date, hour)
  );

  CREATE TABLE IF NOT EXISTS college_leaves (
    id INTEGER PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id, date)
  );
`);

const userColumns = db
  .prepare(`PRAGMA table_info(users)`)
  .all()
  .map((column) => column.name);

if (!userColumns.includes("college")) {
  db.exec(`ALTER TABLE users ADD COLUMN college TEXT`);
}

if (!userColumns.includes("semester")) {
  db.exec(`ALTER TABLE users ADD COLUMN semester TEXT`);
}

if (!userColumns.includes("semester_start")) {
  db.exec(`ALTER TABLE users ADD COLUMN semester_start TEXT`);
}

if (!userColumns.includes("semester_end")) {
  db.exec(`ALTER TABLE users ADD COLUMN semester_end TEXT`);
}

if (!userColumns.includes("target_attendance")) {
  db.exec(`ALTER TABLE users ADD COLUMN target_attendance INTEGER`);
}

if (!userColumns.includes("maximum_attendance")) {
  db.exec(`ALTER TABLE users ADD COLUMN maximum_attendance INTEGER`);
}

module.exports = db;
