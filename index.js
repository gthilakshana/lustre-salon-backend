import express from "express";
import mongoose from "mongoose";
import studentRouter from "./routes/studentsRouter.js";
import userRouter from "./routes/userRouter.js";

const app = express()

// Middleware
app.use(express.json())
// Middleware


const connectionString =  "mongodb+srv://admin:123@cluster0.ya0uqag.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
mongoose.connect(connectionString).then(
    () => {
    console.log("Connected to connected")
  }
).catch(
    ()=>{
        console.log("Database connection failed")
    }
)

app.use("/students", studentRouter)
app.use("/users", userRouter)   

app.listen(5000, 
    () => {
    console.log("Server is started")
    
})