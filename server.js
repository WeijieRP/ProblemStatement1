const express = require("express");
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const app = express();
app.use(express.json());

/* =========================
   CORS
   ========================= */
// ✅ for deployment, allow Render frontend / Vercel later
// easiest: allow all origins during development
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  // add your deployed frontend later:
  // "https://xxxx.vercel.app",
  // "https://xxxx.onrender.com",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (Postman, server-to-server)
      if (!origin) return callback(null, true);

      // ✅ allow local dev origins
      if (allowedOrigins.includes(origin)) return callback(null, true);

      // ✅ allow Render subdomains automatically (optional)
      if (origin.endsWith(".onrender.com")) return callback(null, true);

      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  })
);

// ✅ IMPORTANT for Render: use process.env.PORT
const PORT = Number(process.env.PORT || 3000);

// ✅ MySQL config
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 3306),
};

// Health check
app.get("/", (req, res) => {
  res.json({ message: "API is running ✅" });
});

/* =========================
   GET: all cards
   ========================= */
app.get("/allcards", async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      "SELECT * FROM module_cards.educationdb ORDER BY created_at DESC"
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error: cards cannot be fetched" });
  } finally {
    if (connection) await connection.end();
  }
});

/* =========================
   GET: one card by id
   ========================= */
app.get("/cards/:id", async (req, res) => {
  const { id } = req.params;
  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      "SELECT * FROM module_cards WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Card not found" });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error: cannot fetch card" });
  } finally {
    if (connection) await connection.end();
  }
});

/* =========================
   POST: create card
   ========================= */
app.post("/cards", async (req, res) => {
  const { title, module_name, module_code, description, status } = req.body;

  if (!title || !module_name || !module_code) {
    return res.status(400).json({
      message: "Missing required fields: title, module_name, module_code",
    });
  }

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);

    const [result] = await connection.execute(
      `INSERT INTO module_cards (title, module_name, module_code, description, status)
       VALUES (?, ?, ?, ?, ?)`,
      [
        title,
        module_name,
        module_code,
        description ?? null,
        status ?? "ACTIVE",
      ]
    );

    return res.status(201).json({
      message: "Card created successfully",
      id: result.insertId,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error: cannot create card" });
  } finally {
    if (connection) await connection.end();
  }
});

/* =========================
   PUT: update card
   ========================= */
app.put("/cards/:id", async (req, res) => {
  const { id } = req.params;
  const { title, module_name, module_code, description, status } = req.body;

  if (!title || !module_name || !module_code) {
    return res.status(400).json({
      message: "Missing required fields: title, module_name, module_code",
    });
  }

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);

    const [result] = await connection.execute(
      `UPDATE module_cards
       SET title = ?, module_name = ?, module_code = ?, description = ?, status = ?
       WHERE id = ?`,
      [
        title,
        module_name,
        module_code,
        description ?? null,
        status ?? "ACTIVE",
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Card not found" });
    }

    return res.json({ message: "Card updated successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error: cannot update card" });
  } finally {
    if (connection) await connection.end();
  }
});

/* =========================
   DELETE: remove card
   ========================= */
app.delete("/cards/:id", async (req, res) => {
  const { id } = req.params;
  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);

    const [result] = await connection.execute(
      "DELETE FROM module_cards WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Card not found" });
    }

    return res.json({ message: "Card deleted successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error: cannot delete card" });
  } finally {
    if (connection) await connection.end();
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
