const User= require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

//generate JWT token
const generateToken = (userId) => {
    return jwt.sign({id: userId}, process.env.JWT_SECRET, {expiresIn: "7d"});

};


//@desc register a new user
//@route POST/api/auth/register
//@access Public

const registerUser = async (req, res) => {
    try {
        const {name, email, password, profileImageUrl, adminInviteToken} =
        req.body;

        //check if user already exists

        const userExists=await User.findOne({email});
        if (userExists){
            return res.status(400).json({message:"User already exists"});
        }

        let role = "member";
        if(
            adminInviteToken && 
            adminInviteToken == process.env.ADMIN_INVITE_TOKEN
        ) {
            role = "admin";
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            name, 
            email,
            password: hashedPassword,
            profileImageUrl,
            role,
        });

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            profileImageUrl: user.profileImageUrl,
            token: generateToken(user._id),
        });

    } catch (error){
        res.status(500).json({message: "Server error",error: error.message});
    }
};

//@desc Login user
//@route POST/api/auth/login
//@access Public
const loginUser = async (req, res)=> {

    try {

    } catch (error){
        res.status(500).json({message: "Server error",error: error.message});
    }
};

//@desc Get user profile
//@route GET/api/auth/profile
//@access Private(Requires JWT)
const getUserProfile = async(req, res) => {};

//@desc update user profile
//@route PUT/api/auth/profile
//@access Private (Requires JWT)

const updateUserProfile = async(req, res) => {};

module.exports = {registerUser, loginUser, getUserProfile,updateUserProfile};
