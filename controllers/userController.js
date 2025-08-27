import User from "../models/user.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken"; 
import dotenv from "dotenv"
dotenv.config()

export function createUser(req, res) {
  
    const newUserData = req.body;


if (newUserData.type === "admin") {
  
  if (!req.user) {
    return res.status(401).json({
      message: "Please login as administrator to create admin account"
    });
  }

  if (req.user.type !== "admin") {
    return res.status(403).json({
      message: "Only administrators can create admin accounts"
    });
  }

  console.log("Creating an admin account");
}


newUserData.password = bcrypt.hashSync(newUserData.password, 10);


const user = new User(newUserData);
user
  .save()
  .then(() => {
    res.json({
      message: "Signup successfully"
    });
  })
  .catch((err) => {
    console.error("Error creating user:", err);
    res.status(500).json({
      error: err.message
    });
  });

}

export function loginUser(req, res) {
  User.findOne({ email: req.body.email })
    .then((user) => {
      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      const isPasswordMatching = bcrypt.compareSync(
        req.body.password,
        user.password
      );

      if (!isPasswordMatching) {
        return res.status(401).json({
          message: "Invalid email or password",
        });
      }

     
      const token = jwt.sign(
        {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
        },
        process.env.JWT_SECRET,
        { expiresIn: "1h" } 
      );

      return res.json({
        message: "Login successfully",
        token: token,
        user: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
        },
      });
    })
    .catch((err) => {
      console.error("Login error:", err);
      res.status(500).json({ error: "Internal server error" });
    });
}



export function isAdmin(req){
    if(req.user == null){
       return false
    }
    if(req.user.role != "admin"){
        return false
    }
    return true;
}
