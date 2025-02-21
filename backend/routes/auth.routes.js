import { Router } from "express";
import {
  signup,
  login,
  logout,
  getMe,
} from "../controllers/auth.controllers.js";
import protectedRoute from "../middlewares/protectedRoute.js";
const router = Router();
router.get("/getme", protectedRoute, getMe);
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

export default router;
