// ============================================================
//  unit.test.js 
//  Çalıştırma: npx jest tests/unit.test.js --verbose
// ============================================================
// ── Ortam değişkeni (protect içindeki jwt.verify için) ──────
process.env.JWT_SECRET = "test_secret";

const jwt = require("jsonwebtoken");

// ============================================================
//  MOCK'LAR — jest.mock() DOSYANIN EN ÜSTÜNDE olmalı!
//  Sebebi: Jest bunları otomatik olarak dosyanın en tepesine
//  "hoist" eder. beforeEach içinde değişkene bağlamak patlar.
// ============================================================

jest.mock("../models/User", () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
}));

jest.mock("../models/Task", () => ({
  findById: jest.fn(),
}));

// Mock'lar tanımlandıktan SONRA import ediyoruz
const { protect } = require("../middlewares/authMiddleware");
const {
  getTaskById,
  updateTaskChecklist,
} = require("../controllers/taskController");
const { registerUser } = require("../controllers/authController");
const Task = require("../models/Task");
const User = require("../models/User");

// ============================================================
//  UNIT 6 — Geçersiz token → protect → 401
// ============================================================
describe("Unit 6: protect middleware — geçersiz token → 401", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("Authorization header hiç yoksa 401 döner", async () => {
    const req = { headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.any(String) })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("Bozuk (imzasız) token gönderilirse 401 döner", async () => {
    const req = {
      headers: { authorization: "Bearer bu.gecersiz.birtoken" },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("Süresi dolmuş token gönderilirse 401 döner", async () => {
    const expiredToken = jwt.sign(
      { id: "507f1f77bcf86cd799439011" },
      process.env.JWT_SECRET,
      { expiresIn: -1 }
    );
    const req = {
      headers: { authorization: `Bearer ${expiredToken}` },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

// ============================================================
//  UNIT 7 — Olmayan task ID → getTaskById → 404
// ============================================================
describe("Unit 7: getTaskById — olmayan ID → 404", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("Veritabanında olmayan ID için 404 döner", async () => {
    Task.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue(null),
    });

    const req = {
      params: { id: "507f1f77bcf86cd799439011" },
      user: { _id: "000000000000000000000001" },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await getTaskById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("not found") })
    );
  });

  it("findById null dönünce response body 'Task not found' içerir", async () => {
    Task.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue(null),
    });

    const req = {
      params: { id: "507f1f77bcf86cd799439099" },
      user: { _id: "000000000000000000000001" },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await getTaskById(req, res);

    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.message).toBe("Task not found");
  });
});

// ============================================================
//  UNIT 8 — Kayıtlı e-posta ile registerUser → 400
// ============================================================
describe("Unit 8: registerUser — kayıtlı e-posta → 400", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("Zaten kayıtlı e-posta ile istek gelirse 400 döner", async () => {
    // authController User.findOne().maxTimeMS() zinciri kullanıyor
    User.findOne.mockReturnValue({
      maxTimeMS: jest.fn().mockResolvedValue({
        _id: "existingId",
        email: "test@example.com",
      }),
    });

    const req = {
      body: {
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await registerUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "User already exists" })
    );
  });

  it("Kayıtlı e-posta durumunda User.create hiç çağrılmaz", async () => {
    User.findOne.mockReturnValue({
      maxTimeMS: jest.fn().mockResolvedValue({ email: "taken@example.com" }),
    });

    const req = {
      body: { name: "Test", email: "taken@example.com", password: "pass1234" },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await registerUser(req, res);

    // Kullanıcı zaten varsa create çağrılmamalı
    expect(User.create).not.toHaveBeenCalled();
  });
});

// ============================================================
//  UNIT 9 — Checklist'e göre progress doğru hesaplanmalı
// ============================================================
describe("Unit 9: updateTaskChecklist — progress doğru hesaplanmalı", () => {
  const makeFakeTask = () => ({
    _id: "taskId123",
    createdBy: { toString: () => "userId1" },
    assignedTo: [{ toString: () => "userId1" }],
    todoChecklist: [],
    progress: 0,
    status: "Pending",
    save: jest.fn().mockResolvedValue(true),
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("3 itemdan 2'si completed → progress %67 olur", async () => {
    const checklist = [
      { text: "item1", completed: true },
      { text: "item2", completed: true },
      { text: "item3", completed: false },
    ];
    const fakeTask = makeFakeTask();

    Task.findById
      .mockReturnValueOnce(fakeTask)
      .mockReturnValueOnce({
        populate: jest.fn().mockResolvedValue({ ...fakeTask, progress: 67 }),
      });

    const req = {
      params: { id: "taskId123" },
      user: { _id: { toString: () => "userId1" } },
      body: { todoChecklist: checklist },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await updateTaskChecklist(req, res);

    // Controller Math.round(2/3*100) = 67 hesaplar ve fakeTask.progress'e yazar
    expect(fakeTask.save).toHaveBeenCalled();
    expect(fakeTask.progress).toBe(67);
  });

  it("Hiç item completed değilse progress 0, status Pending olur", async () => {
    const checklist = [
      { text: "item1", completed: false },
      { text: "item2", completed: false },
    ];
    const fakeTask = makeFakeTask();

    Task.findById
      .mockReturnValueOnce(fakeTask)
      .mockReturnValueOnce({
        populate: jest.fn().mockResolvedValue({ ...fakeTask, progress: 0 }),
      });

    const req = {
      params: { id: "taskId123" },
      user: { _id: { toString: () => "userId1" } },
      body: { todoChecklist: checklist },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await updateTaskChecklist(req, res);

    expect(fakeTask.progress).toBe(0);
    expect(fakeTask.status).toBe("Pending");
  });
});

// ============================================================
//  UNIT 10 — Tüm checklist completed → status "Completed"
// ============================================================
describe("Unit 10: updateTaskChecklist — tüm itemlar completed → status Completed", () => {
  const makeFakeTask = () => ({
    _id: "taskId456",
    createdBy: { toString: () => "userId1" },
    assignedTo: [{ toString: () => "userId1" }],
    todoChecklist: [],
    progress: 0,
    status: "In Progress",
    save: jest.fn().mockResolvedValue(true),
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("Tüm itemlar completed → progress 100, status 'Completed' olur", async () => {
    const allDoneChecklist = [
      { text: "item1", completed: true },
      { text: "item2", completed: true },
      { text: "item3", completed: true },
    ];
    const fakeTask = makeFakeTask();

    Task.findById
      .mockReturnValueOnce(fakeTask)
      .mockReturnValueOnce({
        populate: jest.fn().mockResolvedValue({
          ...fakeTask,
          todoChecklist: allDoneChecklist,
          progress: 100,
          status: "Completed",
        }),
      });

    const req = {
      params: { id: "taskId456" },
      user: { _id: { toString: () => "userId1" } },
      body: { todoChecklist: allDoneChecklist },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await updateTaskChecklist(req, res);

    expect(fakeTask.progress).toBe(100);
    expect(fakeTask.status).toBe("Completed");
    expect(fakeTask.save).toHaveBeenCalled();
  });

  it("Progress 100 olunca response'ta status 'Completed' gelir", async () => {
    const allDoneChecklist = [
      { text: "a", completed: true },
      { text: "b", completed: true },
    ];
    const fakeTask = makeFakeTask();

    const populatedTask = {
      todoChecklist: allDoneChecklist,
      progress: 100,
      status: "Completed",
    };

    Task.findById
      .mockReturnValueOnce(fakeTask)
      .mockReturnValueOnce({
        populate: jest.fn().mockResolvedValue(populatedTask),
      });

    const req = {
      params: { id: "taskId456" },
      user: { _id: { toString: () => "userId1" } },
      body: { todoChecklist: allDoneChecklist },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await updateTaskChecklist(req, res);

    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.task.status).toBe("Completed");
    expect(jsonArg.task.progress).toBe(100);
  });
});