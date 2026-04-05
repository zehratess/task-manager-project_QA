require("dotenv").config();
const request = require("supertest");
const app = require("../server");
const mongoose = require("mongoose");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

jest.setTimeout(30000);

describe("Task API Smoke Tests", () => {
  let adminToken;
  let userToken;
  let taskId;

  // ── KURULUM ─────────────────────────────────────────────────────────────
  beforeAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(process.env.TEST_MONGO_URI);

    await User.deleteMany({});

    const salt = await bcrypt.genSalt(10);
    const adminPass = await bcrypt.hash("admin123", salt);
    const userPass = await bcrypt.hash("user1234", salt);

    await User.create([
      { name: "Admin Test", email: "admin@test.com", password: adminPass, role: "admin" },
      { name: "User Test",  email: "user@test.com",  password: userPass,  role: "member" },
    ]);

    const adminRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@test.com", password: "admin123" });
    adminToken = adminRes.body.token;

    const userRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@test.com", password: "user1234" });
    userToken = userRes.body.token;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  // ── SMOKE TEST 1: REGISTER ───────────────────────────────────────────────
  describe("POST /api/auth/register", () => {
    it("should register a new user and return 201", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Yeni Kullanici",
          email: "yeni@test.com",
          password: "yeni1234",
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("_id");
      expect(res.body).toHaveProperty("token");
      expect(res.body.email).toBe("yeni@test.com");
    });

    it("should return 400 if user already exists", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Admin Test",
          email: "admin@test.com",
          password: "admin123",
        });

      expect(res.statusCode).toBe(400);
    });
  });

  // ── SMOKE TEST 2: LOGIN ──────────────────────────────────────────────────
  describe("POST /api/auth/login", () => {
    it("should login and return 200 with token", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "admin@test.com", password: "admin123" });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("token");
      expect(typeof res.body.token).toBe("string");
      expect(res.body.token.length).toBeGreaterThan(0);
    });

    it("should return 401 with wrong password", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "admin@test.com", password: "yanlis_sifre" });

      expect(res.statusCode).toBe(401);
    });
  });

  // ── SMOKE TEST 3: AUTH GEREKLİ ENDPOINT → 401 ───────────────────────────
  describe("GET /api/tasks (auth required)", () => {
    it("should return 401 without token", async () => {
      const res = await request(app).get("/api/tasks");
      expect(res.statusCode).toBe(401);
    });

    it("should return 200 with valid token", async () => {
      const res = await request(app)
        .get("/api/tasks")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("tasks");
      expect(Array.isArray(res.body.tasks)).toBe(true);
    });
  });

  // ── SMOKE TEST 4: TASK OLUŞTURMA → 201 ──────────────────────────────────
  describe("POST /api/tasks", () => {
    it("should create a new task and return 201 with id and title", async () => {
      const res = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title: "Smoke Test Task",
          description: "Test açıklaması",
          priority: "High",
          dueDate: new Date(Date.now() + 86400000),
          assignedTo: [],
          todoChecklist: [{ text: "Test adımı", completed: false }],
          attachments: [],
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("task");
      expect(res.body.task).toHaveProperty("_id");
      expect(res.body.task.title).toBe("Smoke Test Task");
      taskId = res.body.task._id;
    });

    it("should return 500 when required fields are missing", async () => {
      const res = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ title: "Sadece Başlık" });

      expect(res.statusCode).toBe(500);
    });
  });

  // ── SMOKE TEST 5: TASK LİSTELEME → 200 ─────────────────────────────────
  describe("GET /api/tasks (list)", () => {
    it("should return 200 and include the created task", async () => {
      const res = await request(app)
        .get("/api/tasks")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("tasks");
      const ids = res.body.tasks.map((t) => t._id);
      expect(ids).toContain(taskId);
    });
  });

  // ── SMOKE TEST 6: TEK TASK OKUMA → 200 ──────────────────────────────────
  describe("GET /api/tasks/:id", () => {
    it("should return 200 and the task by ID", async () => {
      const res = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body._id).toBe(taskId);
    });

    it("should return 404 for non-existent ID", async () => {
      const res = await request(app)
        .get("/api/tasks/123456789012345678901234")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(404);
    });
  });

  // ── SMOKE TEST 7: TASK GÜNCELLEME → 200 ─────────────────────────────────
  describe("PUT /api/tasks/:id", () => {
    it("should update task and return 200 with updated title", async () => {
      const res = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ title: "Güncellenmiş Başlık" });

      expect(res.statusCode).toBe(200);
      expect(res.body.updatedTask.title).toBe("Güncellenmiş Başlık");
    });
  });

  // ── SMOKE TEST 8: TASK SİLME → 200; SONRA 404 ───────────────────────────
  describe("DELETE /api/tasks/:id", () => {
    it("should delete task and return 200", async () => {
      const res = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain("deleted");
    });

    it("should return 404 after deletion", async () => {
      const res = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(404);
    });
  });

  // ── SMOKE TEST 9: VALİDATION → 400/500 ──────────────────────────────────
  describe("POST /api/tasks (validation)", () => {
    it("should return error when title is missing", async () => {
      const res = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ description: "Başlık yok" });

      expect([400, 500]).toContain(res.statusCode);
    });
  });

  // ── SMOKE TEST 10: ADMIN-ONLY ENDPOINT ──────────────────────────────────
  describe("GET /api/users (admin-only)", () => {
    it("should return 403 when accessed by regular user", async () => {
      const res = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.statusCode).toBe(403);
    });

    it("should return 200 when accessed by admin", async () => {
      const res = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
    });
  });
});
