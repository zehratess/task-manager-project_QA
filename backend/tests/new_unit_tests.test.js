process.env.JWT_SECRET = "test_secret";

describe("Unit Tests , 5 cases", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

    //******************************************************************************** 

  describe("Unit 1: title bos -> hata", () => {
    it("title bos ise 400 donmeli", async () => {
      jest.resetModules();

      const mockTask = { create: jest.fn() };

      jest.doMock("../models/Task", () => mockTask);
      jest.doMock("../models/User", () => ({}));

      const { createTask } = require("../controllers/taskController");

      const req = {
        body: {
          title: "",
          description: "Aciklama",
          priority: "High",
          dueDate: new Date(Date.now() + 86400000),
        },
        user: { _id: "1", role: "admin" },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
  //********************************************************************************

  describe("Unit 2: dueDate gecmis -> hata", () => {
    it("gecmis dueDate ise 400 donmeli", async () => {
      jest.resetModules();

      const mockTask = { create: jest.fn() };

      jest.doMock("../models/Task", () => mockTask);
      jest.doMock("../models/User", () => ({}));

      const { createTask } = require("../controllers/taskController");

      const req = {
        body: {
          title: "Task",
          description: "Aciklama",
          priority: "Medium",
          dueDate: new Date(Date.now() - 86400000),
        },
        user: { _id: "1", role: "admin" },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
    //********************************************************************************


  describe("Unit 3: priority kontrol", () => {
    it("gecersiz priority ise 400 donmeli", async () => {
      jest.resetModules();

      const mockTask = { create: jest.fn() };

      jest.doMock("../models/Task", () => mockTask);
      jest.doMock("../models/User", () => ({}));

      const { createTask } = require("../controllers/taskController");

      const req = {
        body: {
          title: "Task",
          description: "Aciklama",
          priority: "Urgent",
          dueDate: new Date(Date.now() + 86400000),
        },
        user: { _id: "1", role: "admin" },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
    //********************************************************************************


  describe("Unit 4: admin -> adminOnly gecmeli", () => {
    it("admin ise next cagrilmali", async () => {
      jest.resetModules();

      const { adminOnly } = require("../middlewares/authMiddleware");

      const req = { user: { role: "admin" } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await adminOnly(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
    //********************************************************************************


  describe("Unit 5: member -> 403", () => {
    it("member ise 403 donmeli", async () => {
      jest.resetModules();

      const { adminOnly } = require("../middlewares/authMiddleware");

      const req = { user: { role: "member" } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await adminOnly(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });
});