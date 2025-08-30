import express from "express";
import mongoose from "mongoose";
import studentRouter from "./routes/studentsRouter.js";
import userRouter from "./routes/userRouter.js";
import productRouter from "./routes/productRouter.js";
import jwt from "jsonwebtoken";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --- Jwt Token Middleware --- //
app.use((req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; 
    } catch (err) {
      console.warn("Invalid token:", err.message);
     
    }
  }

  next();
});
// --- Jwt Token Middleware --- //


mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Database is connected"))
  .catch(() => console.log("Database connection failed"));


app.use("/api/students", studentRouter);
app.use("/api/users", userRouter);
app.use("/api/products", productRouter);


app.listen(5000, () => {
  console.log("Server is started on port 5000");
});
