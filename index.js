import express from "express";
import mongoose from "mongoose";
import Student from "./models/student.js";

const app = express()

// Middleware
app.use(express.json())
// Middleware


const connectionString =  "mongodb+srv://admin:123@cluster0.ya0uqag.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
mongoose.connect(connectionString).then(
    () => {
    console.log("Connected to MongoDB")
  }
).catch(
    ()=>{
        console.log("Database connection failed")
    }
)

app.get('/',
    (req, res)=>{
        console.log(req.body)
        console.log("Hello World")
 
        res.json({
            message: "Hello "+ prefix + " " + req.body.name
        })
    }
)

app.post('/',
    (req , res)=>{
        console.log("Hello World")
    }
)

app.delete('/',
    (req , res)=>{
        console.log("Delete request")
    }
)

app.listen(5000, () => {
    console.log("Server is running on port 5000")
    console.log("Server is running on port 5000")
})