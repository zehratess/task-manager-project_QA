const express = require("express");

const router = express.Router();

//auth routes
router.post("/register", registerUser); //register user
router.post("/login" , loginUser); //login user
router.get("/profile", ProfilePhotoSelector, getUserProfile); //get user profile
router.put("/profile", protect, updateUserProfile); //update profile

module.exports = router;