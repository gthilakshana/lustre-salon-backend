import express from "express";
import mongoose from "mongoose";
import studentRouter from "./routes/studentsRouter.js";
import userRouter from "./routes/userRouter.js";
import productRouter from "./routes/productRouter.js";
import jwt from "jsonwebtoken"
import cors from "cors"
import dotenv from "dotenv"
dotenv.config()


const app = express()
app.use (cors())
// Middleware
app.use(express.json())

//--- Jwt Token ---//
app.use((req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  console.log(token);

  if (token !== null) {
    jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
      if (!error) {
        req.user = decoded;
      }
    });
  }

  next();
});
//--- Jwt Token ---//
// Middleware


const connectionString =  process.env.MONGO_URI
mongoose.connect(connectionString).then(
    () => {
    console.log("Database is connected")
  }
).catch(
    ()=>{
        console.log("Database connection failed")
    }
)

app.use("/api/students", studentRouter)
app.use("/api/users", userRouter)   
app.use("/api/products", productRouter)

app.listen(5000, 
    () => {
    console.log("Server is started")
    
})