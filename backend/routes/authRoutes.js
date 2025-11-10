const express = require("express");
const { getUserProfile, updateUserProfile, loginUser, registerUser } = require("../controllers/authController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

//auth routes
router.post("/register", registerUser); //register user
router.post("/login" , loginUser); //login user
router.get("/profile", protect, getUserProfile); //get user profile
router.put("/profile", protect, updateUserProfile); //update profile

module.exports = router;