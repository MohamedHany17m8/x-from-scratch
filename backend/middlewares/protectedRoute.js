import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import dotenv from "dotenv";

dotenv.config();

const protectedRoute = async (req, res, next) => {
  try {
    // Check if the cookie exists
    const token = req.cookies.jwt;
    if (!token) {
      return res.status(401).send("Access denied. No token provided.");
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    // Ensure the user ID exists
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).send("User not found.");
    }

    // Attach user to request object without password
    req.user = user;

    next();
  } catch (error) {
    res.status(400).send("Invalid token.");
  }
};

export default protectedRoute;
