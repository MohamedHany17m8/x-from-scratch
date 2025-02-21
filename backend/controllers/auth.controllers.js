import User from "../models/user.model.js";
import bcrypt from "bcrypt";
import generateToken from "../lib/utils/generateToken.js";

export const signup = async (req, res, next) => {
  const { username, fullName, password, email } = req.body;

  try {
    // Check if email is valid
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).send("Invalid email format");
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).send("Email already exists");
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).send("Username already taken");
    }

    // Check if password is at least 8 characters long
    if (password.length < 8) {
      return res
        .status(400)
        .send("Password must be at least 8 characters long");
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      username,
      fullName,
      password: hashedPassword,
      email,
    });

    await newUser.save();

    // Generate token and set cookie
    req.body.userId = newUser._id;
    generateToken(req, res, () => {
      const {
        _id,
        username,
        fullName,
        email,
        followers,
        following,
        profileImg,
        coverImg,
        bio,
        link,
        likedPosts,
      } = newUser;
      res.status(201).json({
        _id,
        username,
        fullName,
        email,
        followers,
        following,
        profileImg,
        coverImg,
        bio,
        link,
        likedPosts,
      });
    });
  } catch (error) {
    res.status(500).send("Error during signup");
  }
};

export const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    // Check if user exists by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).send("Invalid username");
    }

    // Check if password is correct
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).send("Invalid password");
    }

    // Generate token and set cookie
    req.body.userId = user._id;
    generateToken(req, res, () => {
      const {
        _id,
        username,
        fullName,
        email,
        followers,
        following,
        profileImg,
        coverImg,
        bio,
        link,
        likedPosts,
      } = user;
      res.status(200).json({
        _id,
        username,
        fullName,
        email,
        followers,
        following,
        profileImg,
        coverImg,
        bio,
        link,
        likedPosts,
      });
    });
  } catch (error) {
    res.status(500).send("Error during login");
  }
};

export const logout = async (req, res) => {
  try {
    res.clearCookie("jwt", {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      sameSite: "strict",
    });
    res.status(200).send("Logout successful");
  } catch (error) {
    res.status(500).send("Error during logout");
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).send("User not found");
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).send("Error getting user");
  }
};
