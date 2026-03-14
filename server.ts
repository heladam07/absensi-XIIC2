import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: any = null;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Initialize Database
  try {
    console.log("Initializing database...");
    db = new Database("absensi_pintar.db");
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        role TEXT CHECK(role IN ('student', 'teacher', 'parent')),
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        class_name TEXT,
        child_id INTEGER, -- For parents
        FOREIGN KEY (child_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        status TEXT CHECK(status IN ('Hadir', 'Izin', 'Sakit', 'Alpa')),
        selfie_url TEXT,
        notes TEXT,
        date TEXT DEFAULT CURRENT_DATE,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id)
      );
    `);

    // Seed initial data
    const userCount = db.prepare("SELECT count(*) as count FROM users").get() as { count: number };
    if (userCount.count === 0) {
      console.log("Seeding initial data...");
      // Teachers
      const teacherNames = [
        "IBU ELNI", "PAK SERVAS", "PAK MURTO", "PAK ABE", "PAK KEVIN",
        "IBU ELIN", "IBU ANI", "IBU MEI", "PAK JAFRO", "PAK WILLI", "PAK VIKI"
      ];

      teacherNames.forEach((name, index) => {
        const username = index === 0 ? "guru" : `guru${index + 1}`;
        const password = index === 0 ? "guru123" : "password";
        db.prepare("INSERT INTO users (name, role, username, password) VALUES (?, ?, ?, ?)").run(name, "teacher", username, password);
      });
      
      const studentNames = [
        "Agresia A.Cika", "Agustinus G.Nggeal", "Aleksius Hugo", "Alimira P.E.Syamlan",
        "Amelia C.Anul", "Efrasia F.Latar", "Gregorius R.Jerni", "Maria E.B.Jehama",
        "Maria K.m.Batumali", "Maria S.Jehambur", "Maria Y.T.Dangur", "Marsela V. Indriani",
        "Michela M.Lioran", "Modestus M.Jemadi", "Monika Y.Stiani", "Natalia NAbit",
        "Oktavianus Kasu", "Oswaldus A.Jelahu", "Reinaldus Jorsen", "Sevrianus Areh",
        "Simfonianus D.Agol", "Vinsensius V.Jalar", "Yoalita A.D.Jeneo", "Yohana A. Adam",
        "Yohanes Florentino", "Yonesius Balsano", "Yorimus O.Adu"
      ];

      studentNames.forEach((name, index) => {
        const username = index === 0 ? "siswa1" : `siswa${index + 1}`;
        const password = index === 0 ? "siswa12" : "password";
        db.prepare("INSERT INTO users (name, role, username, password, class_name) VALUES (?, ?, ?, ?, ?)").run(name, "student", username, password, "XIIC2");
      });

      const andiId = db.prepare("SELECT id FROM users WHERE username = ?").get("siswa1") as { id: number };
      
      if (andiId) {
        db.prepare("INSERT INTO users (name, role, username, password, child_id) VALUES (?, ?, ?, ?, ?)").run("Orang Tua Agresia", "parent", "ortu", "ortu321", andiId.id);
      }
      console.log("Seeding completed.");
    }
    console.log("Database initialized successfully.");
  } catch (err) {
    console.error("Database initialization failed:", err);
  }

  // Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", database: !!db });
  });

  // Auth Mock
  app.post("/api/login", (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ error: "Database tidak tersedia. Silakan hubungi administrator." });
      }
      const { username, password } = req.body;
      const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password);
      if (user) {
        res.json(user);
      } else {
        res.status(401).json({ error: "Username atau password salah" });
      }
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Terjadi kesalahan internal pada server" });
    }
  });

  // Get Students (for Teacher)
  app.get("/api/students", (req, res) => {
    try {
      if (!db) throw new Error("Database not initialized");
      const students = db.prepare("SELECT * FROM users WHERE role = 'student'").all();
      res.json(students);
    } catch (error) {
      res.status(500).json({ error: "Gagal mengambil data siswa" });
    }
  });

  // Get Attendance Today
  app.get("/api/attendance/today", (req, res) => {
    try {
      if (!db) throw new Error("Database not initialized");
      const attendance = db.prepare(`
        SELECT a.*, u.name as student_name 
        FROM attendance a 
        JOIN users u ON a.student_id = u.id 
        WHERE a.date = CURRENT_DATE
      `).all();
      res.json(attendance);
    } catch (error) {
      res.status(500).json({ error: "Gagal mengambil data absensi hari ini" });
    }
  });

  // Submit Attendance (for Student)
  app.post("/api/attendance", (req, res) => {
    try {
      if (!db) throw new Error("Database not initialized");
      const { student_id, status, selfie_url, notes } = req.body;
      const existing = db.prepare("SELECT id FROM attendance WHERE student_id = ? AND date = CURRENT_DATE").get(student_id);
      
      if (existing) {
        db.prepare("UPDATE attendance SET status = ?, selfie_url = ?, notes = ? WHERE id = ?").run(status, selfie_url, notes, (existing as any).id);
      } else {
        db.prepare("INSERT INTO attendance (student_id, status, selfie_url, notes) VALUES (?, ?, ?, ?)").run(student_id, status, selfie_url, notes);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Gagal mengirim absensi" });
    }
  });

  // Get Child Attendance (for Parent)
  app.get("/api/child-attendance/:child_id", (req, res) => {
    try {
      if (!db) throw new Error("Database not initialized");
      const { child_id } = req.params;
      const history = db.prepare("SELECT * FROM attendance WHERE student_id = ? ORDER BY date DESC").all(child_id);
      const child = db.prepare("SELECT name FROM users WHERE id = ?").get(child_id);
      res.json({ history, child_name: (child as any)?.name });
    } catch (error) {
      res.status(500).json({ error: "Gagal mengambil data absensi anak" });
    }
  });

  // Stats
  app.get("/api/stats", (req, res) => {
    try {
      if (!db) throw new Error("Database not initialized");
      const stats = db.prepare(`
        SELECT status, COUNT(*) as count 
        FROM attendance 
        WHERE date = CURRENT_DATE
        GROUP BY status
      `).all();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Gagal mengambil statistik" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
