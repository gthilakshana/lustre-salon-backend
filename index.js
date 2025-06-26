import express from "express";

const app = express()

// Middleware
app.use(express.json())
// Middleware

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