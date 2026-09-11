const express = require("express");
const cors = require("cors");
const { authenticateToken } = require("./middleware");
const db = require("./database");

const users = require("./users");
const { createUser, verifyPassword, createToken } = require("./auth");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Attendix server is running 🚀",
  });
});

app.get("/api/protected-test", authenticateToken, (req, res) => {
  res.json({
    message: "Protected API access granted 🔐",
    userId: req.user.userId,
  });
});

app.get("/api/auth/me", authenticateToken, (req, res) => {
  const currentUser = db
    .prepare(
      `
      SELECT
        id,
        name,
        email,
        college,
        semester,
        semester_start,
        semester_end,
        target_attendance,
        maximum_attendance
      FROM users
      WHERE id = ?
      `,
    )
    .get(req.user.userId);

  if (!currentUser) {
    return res.status(404).json({
      message: "User not found.",
    });
  }

  res.json({
    user: currentUser,
  });
});

app.put("/api/auth/me", authenticateToken, (req, res) => {
  try {
    const {
      name,
      email,
      college,
      semester,
      semester_start,
      semester_end,
      target_attendance,
      maximum_attendance,
    } = req.body;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof college !== "string" ||
      typeof semester !== "string" ||
      typeof semester_start !== "string" ||
      typeof semester_end !== "string" ||
      !Number.isInteger(target_attendance) ||
      !Number.isInteger(maximum_attendance)
    ) {
      return res.status(400).json({
        message: "Name and email must be text.",
      });
    }

    if (!name.trim() || !email.trim()) {
      return res.status(400).json({
        message: "Name and email are required.",
      });
    }

    if (
      !college.trim() ||
      !semester.trim() ||
      !semester_start.trim() ||
      !semester_end.trim()
    ) {
      return res.status(400).json({
        message: "Academic information is required.",
      });
    }

    if (name.trim().length < 2) {
      return res.status(400).json({
        message: "Name must be at least 2 characters long.",
      });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email.trim())) {
      return res.status(400).json({
        message: "Please enter a valid email address.",
      });
    }

    const existingUser = db
      .prepare(
        `
        SELECT id
        FROM users
        WHERE LOWER(email) = LOWER(?)
          AND id != ?
        `,
      )
      .get(email.trim(), req.user.userId);

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    db.prepare(
      `
      UPDATE users
      SET
      name = ?,
      email = ?,
      college = ?,
      semester = ?,
      semester_start = ?,
      semester_end = ?,
      target_attendance = ?,
      maximum_attendance = ?,
      WHERE id = ?
      `,
    ).run(
      name.trim(),
      email.trim(),
      college.trim(),
      semester.trim(),
      semester_start.trim(),
      semester_end.trim(),
      target_attendance,
      maximum_attendance,
      req.user.userId,
    );

    const updatedUser = db
      .prepare(
        `
        SELECT id, name, email, college, semester, semester_start, semester_end, target_attendance, maximum_attendance
        FROM users
        WHERE id = ?
        `,
      )
      .get(req.user.userId);

    res.json({
      message: "Profile updated successfully.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Profile update error:", error);

    res.status(500).json({
      message: "Something went wrong while updating your profile.",
    });
  }
});

app.get("/api/subjects", authenticateToken, (req, res) => {
  try {
    const subjects = db
      .prepare(
        `
        SELECT id, user_id, name, short_name
        FROM subjects
        WHERE user_id = ?
        ORDER BY id ASC
      `,
      )
      .all(req.user.userId);

    res.json({
      userId: req.user.userId,
      subjects,
    });
  } catch (error) {
    console.error("Subjects fetch error:", error);

    res.status(500).json({
      message: "Something went wrong while loading subjects.",
    });
  }
});

app.get("/api/subjects", authenticateToken, (req, res) => {});

app.post("/api/subjects", authenticateToken, (req, res) => {
  try {
    const { name, shortName } = req.body;

    if (typeof name !== "string" || typeof shortName !== "string") {
      return res.status(400).json({
        message: "Subject name and short name must be text.",
      });
    }

    if (!name || !shortName) {
      return res.status(400).json({
        message: "Subject name and short name are required.",
      });
    }

    const existingSubject = db
      .prepare(
        `
    SELECT id
    FROM subjects
    WHERE user_id = ?
      AND (LOWER(name) = LOWER(?) OR LOWER(short_name) = LOWER(?))
  `,
      )
      .get(req.user.userId, name.trim(), shortName.trim());

    if (existingSubject) {
      return res.status(409).json({
        message: "A subject with this name or short name already exists.",
      });
    }

    const subjectId = Date.now();

    db.prepare(
      `
      INSERT INTO subjects (
        id,
        user_id,
        name,
        short_name
      )
      VALUES (?, ?, ?, ?)
    `,
    ).run(subjectId, req.user.userId, name.trim(), shortName.trim());

    const subject = db
      .prepare(
        `
        SELECT id, user_id, name, short_name
        FROM subjects
        WHERE id = ? AND user_id = ?
      `,
      )
      .get(subjectId, req.user.userId);

    res.status(201).json({
      message: "Subject created successfully.",
      subject,
    });
  } catch (error) {
    console.error("Subject creation error:", error);

    res.status(500).json({
      message: "Something went wrong while creating the subject.",
    });
  }
});

app.put("/api/subjects/:id", authenticateToken, (req, res) => {
  try {
    const { name, shortName } = req.body;
    const subjectId = Number(req.params.id);

    if (!name || !shortName) {
      return res.status(400).json({
        message: "Subject name and short name are required.",
      });
    }

    const result = db
      .prepare(
        `
        UPDATE subjects
        SET name = ?, short_name = ?
        WHERE id = ? AND user_id = ?
      `,
      )
      .run(name.trim(), shortName.trim(), subjectId, req.user.userId);

    if (result.changes === 0) {
      return res.status(404).json({
        message: "Subject not found.",
      });
    }

    const subject = db
      .prepare(
        `
        SELECT id, user_id, name, short_name
        FROM subjects
        WHERE id = ? AND user_id = ?
      `,
      )
      .get(subjectId, req.user.userId);

    res.json({
      message: "Subject updated successfully.",
      subject,
    });
  } catch (error) {
    console.error("Subject update error:", error);

    res.status(500).json({
      message: "Something went wrong while updating the subject.",
    });
  }
});

app.delete("/api/subjects/:id", authenticateToken, (req, res) => {
  try {
    const subjectId = Number(req.params.id);

    const result = db
      .prepare(
        `
        DELETE FROM subjects
        WHERE id = ? AND user_id = ?
      `,
      )
      .run(subjectId, req.user.userId);

    if (result.changes === 0) {
      return res.status(404).json({
        message: "Subject not found.",
      });
    }

    res.json({
      message: "Subject deleted successfully.",
    });
  } catch (error) {
    console.error("Subject deletion error:", error);

    res.status(500).json({
      message: "Something went wrong while deleting the subject.",
    });
  }
});

app.post("/api/attendance", authenticateToken, (req, res) => {
  try {
    const { subjectId, date, hour, status } = req.body;

    if (!subjectId || !date || !hour || !status) {
      return res.status(400).json({
        message: "Subject, date, hour and status are required.",
      });
    }

    const subject = db
      .prepare(
        `
        SELECT id
        FROM subjects
        WHERE id = ? AND user_id = ?
      `,
      )
      .get(Number(subjectId), req.user.userId);

    if (!subject) {
      return res.status(404).json({
        message: "Subject not found.",
      });
    }

    const attendanceId = Date.now();

    db.prepare(
      `
      INSERT INTO attendance_records (
        id,
        user_id,
        subject_id,
        date,
        hour,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    ).run(
      attendanceId,
      req.user.userId,
      Number(subjectId),
      date,
      Number(hour),
      status,
    );

    const record = db
      .prepare(
        `
        SELECT
          id,
          user_id,
          subject_id,
          date,
          hour,
          status
        FROM attendance_records
        WHERE id = ? AND user_id = ?
      `,
      )
      .get(attendanceId, req.user.userId);

    res.status(201).json({
      message: "Attendance saved successfully.",
      record,
    });
  } catch (error) {
    console.error("Attendance creation error:", error);

    res.status(500).json({
      message: "Something went wrong while saving attendance.",
    });
  }
});

app.get("/api/attendance", authenticateToken, (req, res) => {
  try {
    const records = db
      .prepare(
        `
        SELECT
          id,
          user_id,
          subject_id,
          date,
          hour,
          status
        FROM attendance_records
        WHERE user_id = ?
        ORDER BY date DESC, hour DESC
      `,
      )
      .all(req.user.userId);

    res.json({
      userId: req.user.userId,
      records,
    });
  } catch (error) {
    console.error("Attendance fetch error:", error);

    res.status(500).json({
      message: "Something went wrong while loading attendance.",
    });
  }
});

app.post("/api/college-leaves", authenticateToken, (req, res) => {
  try {
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({
        message: "Leave date is required.",
      });
    }

    const leaveId = Date.now();

    db.prepare(
      `
      INSERT INTO college_leaves (
        id,
        user_id,
        date
      )
      VALUES (?, ?, ?)
    `,
    ).run(leaveId, req.user.userId, date);

    const leave = db
      .prepare(
        `
        SELECT
          id,
          user_id,
          date
        FROM college_leaves
        WHERE id = ? AND user_id = ?
      `,
      )
      .get(leaveId, req.user.userId);

    res.status(201).json({
      message: "College leave saved successfully.",
      leave,
    });
  } catch (error) {
    console.error("College leave creation error:", error);

    res.status(500).json({
      message: "Something went wrong while saving college leave.",
    });
  }
});

app.get("/api/college-leaves", authenticateToken, (req, res) => {
  try {
    const leaves = db
      .prepare(
        `
        SELECT
          id,
          user_id,
          date
        FROM college_leaves
        WHERE user_id = ?
        ORDER BY date DESC
      `,
      )
      .all(req.user.userId);

    res.json({
      userId: req.user.userId,
      leaves,
    });
  } catch (error) {
    console.error("College leave fetch error:", error);

    res.status(500).json({
      message: "Something went wrong while loading college leaves.",
    });
  }
});

app.delete("/api/college-leaves/:id", authenticateToken, (req, res) => {
  try {
    const leaveId = Number(req.params.id);

    const result = db
      .prepare(
        `
        DELETE FROM college_leaves
        WHERE id = ? AND user_id = ?
      `,
      )
      .run(leaveId, req.user.userId);

    if (result.changes === 0) {
      return res.status(404).json({
        message: "College leave not found.",
      });
    }

    res.json({
      message: "College leave deleted successfully.",
    });
  } catch (error) {
    console.error("College leave deletion error:", error);

    res.status(500).json({
      message: "Something went wrong while deleting college leave.",
    });
  }
});

app.put("/api/attendance/:id", authenticateToken, (req, res) => {
  try {
    const { subjectId, date, hour, status } = req.body;
    const attendanceId = Number(req.params.id);

    if (!subjectId || !date || !hour || !status) {
      return res.status(400).json({
        message: "Subject, date, hour and status are required.",
      });
    }

    const subject = db
      .prepare(
        `
        SELECT id
        FROM subjects
        WHERE id = ? AND user_id = ?
      `,
      )
      .get(Number(subjectId), req.user.userId);

    if (!subject) {
      return res.status(404).json({
        message: "Subject not found.",
      });
    }

    const result = db
      .prepare(
        `
        UPDATE attendance_records
        SET
          subject_id = ?,
          date = ?,
          hour = ?,
          status = ?
        WHERE id = ? AND user_id = ?
      `,
      )
      .run(
        Number(subjectId),
        date,
        Number(hour),
        status,
        attendanceId,
        req.user.userId,
      );

    if (result.changes === 0) {
      return res.status(404).json({
        message: "Attendance record not found.",
      });
    }

    const record = db
      .prepare(
        `
        SELECT
          id,
          user_id,
          subject_id,
          date,
          hour,
          status
        FROM attendance_records
        WHERE id = ? AND user_id = ?
      `,
      )
      .get(attendanceId, req.user.userId);

    res.json({
      message: "Attendance updated successfully.",
      record,
    });
  } catch (error) {
    console.error("Attendance update error:", error);

    res.status(500).json({
      message: "Something went wrong while updating attendance.",
    });
  }
});

app.delete("/api/attendance/:id", authenticateToken, (req, res) => {
  try {
    const attendanceId = Number(req.params.id);

    const result = db
      .prepare(
        `
        DELETE FROM attendance_records
        WHERE id = ? AND user_id = ?
      `,
      )
      .run(attendanceId, req.user.userId);

    if (result.changes === 0) {
      return res.status(404).json({
        message: "Attendance record not found.",
      });
    }

    res.json({
      message: "Attendance deleted successfully.",
    });
  } catch (error) {
    console.error("Attendance deletion error:", error);

    res.status(500).json({
      message: "Something went wrong while deleting attendance.",
    });
  }
});

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required.",
      });
    }

    const existingUser = users.find(
      (user) => user.email.toLowerCase() === email.toLowerCase(),
    );

    const existingDatabaseUser = db
      .prepare("SELECT id FROM users WHERE LOWER(email) = LOWER(?)")
      .get(email);

    if (existingUser || existingDatabaseUser) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    const newUser = await createUser({
      id: String(Date.now()),
      name,
      email,
      password,
    });

    db.prepare(
      `
    INSERT INTO users (
      id,
      name,
      email,
      password,
      college,
      semester,
      semester_start,
      semester_end,
      target_attendance,
      maximum_attendance
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    ).run(
      newUser.id,
      newUser.name,
      newUser.email,
      newUser.password,
      "Your College",
      "Semester 1",
      "2026-08-10",
      "2026-12-18",
      85,
      90,
    );
    users.push(newUser);

    const token = createToken(newUser.id);

    res.status(201).json({
      message: "Account created successfully.",
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);

    res.status(500).json({
      message: "Something went wrong while creating the account.",
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    let existingUser = users.find(
      (user) => user.email.toLowerCase() === email.toLowerCase(),
    );

    if (!existingUser) {
      const databaseUser = db
        .prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?)")
        .get(email);

      if (databaseUser) {
        existingUser = databaseUser;
      }
    }

    if (!existingUser) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const passwordMatch = await verifyPassword(password, existingUser.password);

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const token = createToken(existingUser.id);

    res.json({
      message: "Login successful.",
      token,
      user: {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Something went wrong while logging in.",
    });
  }
});

app.get("/api/database-test", authenticateToken, (req, res) => {
  try {
    const user = db
      .prepare(
        `
        SELECT id, name, email
        FROM users
        WHERE id = ?
      `,
      )
      .get(req.user.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found in database.",
      });
    }

    const subjectsCount = db
      .prepare(
        `
        SELECT COUNT(*) AS count
        FROM subjects
        WHERE user_id = ?
      `,
      )
      .get(req.user.userId);

    const attendanceCount = db
      .prepare(
        `
        SELECT COUNT(*) AS count
        FROM attendance_records
        WHERE user_id = ?
      `,
      )
      .get(req.user.userId);

    const leavesCount = db
      .prepare(
        `
        SELECT COUNT(*) AS count
        FROM college_leaves
        WHERE user_id = ?
      `,
      )
      .get(req.user.userId);

    res.json({
      message: "Database connection and user isolation working 🔐",
      user,
      counts: {
        subjects: subjectsCount.count,
        attendance: attendanceCount.count,
        collegeLeaves: leavesCount.count,
      },
    });
  } catch (error) {
    console.error("Database test error:", error);

    res.status(500).json({
      message: "Database test failed.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Attendix server running on http://localhost:${PORT}`);
});
