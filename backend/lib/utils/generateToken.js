import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const generateToken = (req, res, next) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).send("User ID is required");
  }

  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "15d",
  });

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "strict",
    maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days
  };

  res.cookie("jwt", token, cookieOptions);
  next();
};

export default generateToken;
