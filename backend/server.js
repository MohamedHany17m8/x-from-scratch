import express from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import connectMongoDb from "./db/connectMongoDb.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json()); // Middleware to parse JSON bodies
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

connectMongoDb().then(() => {
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
});
