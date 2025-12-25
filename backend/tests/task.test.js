require("dotenv").config();
const request = require("supertest");
const app = require("../server"); // Express app'ini export et
const mongoose = require("mongoose");
const User = require("../models/User"); // Dosya yolunu kontrol et (genelde ../models/User)
const bcrypt = require("bcryptjs");

jest.setTimeout(30000);

describe("Task API Tests", () => {
  let adminToken;
  let userToken;
  let taskId;

  // Test başlamadan önce
  beforeAll(async () => {
    // 1. Önce eski bağlantıları temizle ve bağlan
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(process.env.TEST_MONGO_URI); // 2. Test veritabanını temizle (her testte sıfırdan başlar)

    await User.deleteMany({}); // 3. Şifreleri hazırla

    const salt = await bcrypt.genSalt(10);
    const adminPass = await bcrypt.hash("admin123", salt);
    const userPass = await bcrypt.hash("user1234", salt); // 4. Test kullanıcılarını test DB'sine ekle

    await User.create([
      {
        name: "Admin Test",
        email: "admin@test.com",
        password: adminPass,
        role: "admin",
      },
      {
        name: "User Test",
        email: "user@test.com",
        password: userPass,
        role: "member", // Sisteminde 'user' ise 'user' yap
      },
    ]); // 5. Şimdi login olup token'ları al

    const adminRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@test.com", password: "admin123" });
    adminToken = adminRes.body.token;

    const userRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@test.com", password: "user1234" });
    userToken = userRes.body.token;
  });

  // Test bittikten sonra
  afterAll(async () => {
    await mongoose.connection.close();
  });

  // ✅ TEST 1: Get All Tasks
  describe("GET /api/tasks", () => {
    it("should return all tasks for authenticated user", async () => {
      const res = await request(app)
        .get("/api/tasks")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("tasks");
      expect(Array.isArray(res.body.tasks)).toBe(true);
    });

    it("should return 401 without token", async () => {
      const res = await request(app).get("/api/tasks");
      expect(res.statusCode).toBe(401);
    });
  });

  // ✅ TEST 2: Create Task
  describe("POST /api/tasks", () => {
    it("should create a new task (admin)", async () => {
      const res = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title: "Test Task",
          description: "Test Description",
          priority: "High",
          dueDate: new Date(Date.now() + 86400000),
          assignedTo: [],
          todoChecklist: [{ text: "Test todo", completed: false }],
          attachments: [],
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("task");
      expect(res.body.task.title).toBe("Test Task");
      taskId = res.body.task._id;
    });

    it("should fail without required fields", async () => {
      const res = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ title: "Only Title" });

      expect(res.statusCode).toBe(500); // veya 400
    });
  });

  // ✅ TEST 3: Get Task by ID
  describe("GET /api/tasks/:id", () => {
    it("should return task by ID", async () => {
      const res = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body._id).toBe(taskId);
    });

    it("should return 404 for invalid ID", async () => {
      const res = await request(app)
        .get("/api/tasks/123456789012345678901234")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(404);
    });
  });

  // ✅ TEST 4: Update Task
  describe("PUT /api/tasks/:id", () => {
    it("should update task", async () => {
    const res = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ title: "Updated Task Title" });

    expect(res.statusCode).toBe(200);
    // res.body.task.title yerine res.body.updatedTask.title kullanıyoruz
    expect(res.body.updatedTask.title).toBe("Updated Task Title"); 
});
  });

  // ✅ TEST 5: Update Task Status
  describe("PUT /api/tasks/:id/status", () => {
    it("should update task status", async () => {
      const res = await request(app)
        .put(`/api/tasks/${taskId}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "Completed" });

      expect(res.statusCode).toBe(200);
      expect(res.body.task.status).toBe("Completed");
    });
  });

  // ✅ TEST 6: Update Checklist
  describe("PUT /api/tasks/:id/todo", () => {
    it("should update todo checklist", async () => {
      const res = await request(app)
        .put(`/api/tasks/${taskId}/todo`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          todoChecklist: [{ text: "Updated todo", completed: true }],
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.task.todoChecklist[0].completed).toBe(true);
    });
  });

  // ✅ TEST 7: Delete Task
  describe("DELETE /api/tasks/:id", () => {
    it("should delete task", async () => {
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

  // ✅ TEST 8: Dashboard Data
  describe("GET /api/tasks/dashboard-data", () => {
    it("should return dashboard statistics", async () => {
      const res = await request(app)
        .get("/api/tasks/dashboard-data")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("statistics");
      expect(res.body).toHaveProperty("charts");
    });
  });
});
