const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");

const app = express();
const db = new Database("tasks.db");

app.use(cors());
app.use(express.json());

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    date TEXT,
    time TEXT,
    completed INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

app.post("/api/signup", (req, res) => {
  const { name, email, password } = req.body;

  const id = crypto.randomUUID();

  try {
    db.prepare(`
      INSERT INTO users (id, name, email, password, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, name, email.toLowerCase(), password, new Date().toISOString());

    res.json({
      user: {
        id,
        name,
        email,
      },
    });
  } catch {
    res.status(400).json({ message: "Email already exists." });
  }
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  const user = db
    .prepare("SELECT * FROM users WHERE email = ? AND password = ?")
    .get(email.toLowerCase(), password);

  if (!user) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  });
});

app.get("/api/tasks/:userId", (req, res) => {
  const tasks = db
    .prepare("SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC")
    .all(req.params.userId);

  res.json(tasks);
});

app.post("/api/tasks", (req, res) => {
  const { userId, title, date, time } = req.body;

  const task = {
    id: crypto.randomUUID(),
    userId,
    title,
    date,
    time,
    completed: 0,
    createdAt: new Date().toISOString(),
  };

  db.prepare(`
    INSERT INTO tasks (id, user_id, title, date, time, completed, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    task.id,
    task.userId,
    task.title,
    task.date ?? null,
    task.time ?? null,
    task.completed,
    task.createdAt
  );

  res.json(task);
});

app.put("/api/tasks/:id", (req, res) => {
  const { title, date, time, completed } = req.body;

  db.prepare(`
    UPDATE tasks
    SET title = ?, date = ?, time = ?, completed = ?
    WHERE id = ?
  `).run(title, date ?? null, time ?? null, completed ? 1 : 0, req.params.id);

  res.json({ success: true });
});

app.delete("/api/tasks/:id", (req, res) => {
  db.prepare("DELETE FROM tasks WHERE id = ?").run(req.params.id);

  res.json({ success: true });
});

app.listen(4000, () => {
  console.log("Backend running on http://localhost:4000");
});