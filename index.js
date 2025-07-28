import express from "express";
import mongoose from "mongoose";
import studentRouter from "./routes/studentsRouter.js";
import userRouter from "./routes/userRouter.js";
import Jwt from "jsonwebtoken"

const app = express()

// Middleware
app.use(express.json())

app.use(
    (req, res, next)=>{
       let token  = req.header("Authorization")

       if(token != null){
        token = token.replace("Bearer ", "")
        console.log(token)
        Jwt.verify(token, "jwt-secret", 
            (err, decoded) => {
            if(decoded == null){
                res.json({
                    message: "Invalid token please login again"
                })
                return
            }else{
              
                req.user = decoded
                
            }
        })
       }
       next()
    }
)
// Middleware


const connectionString =  "mongodb+srv://admin:123@cluster0.ya0uqag.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
mongoose.connect(connectionString).then(
    () => {
    console.log("Database is connected")
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