const express = require("express");
const router = express.Router();
const { getUsers, getUserById } = require("../controllers/userController");
const { protect, adminOnly } = require("../middlewares/authMiddleware");

router.get("/", protect, adminOnly, getUsers);
router.get("/:id", protect, getUserById);

module.exports = router;