import User from "../models/user.js";
import bcrypt from "bcryptjs";

export function createUser(req, res) {
  
    const hashedPassword = bcrypt.hashSync(req.body.password, 10);

   
    const user = new User({
        email: req.body.email,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        password: hashedPassword
    });

    
    user.save()
        .then(() => {
            res.json({
                message: "User created successfully"
            });
        })
        .catch((err) => {
            res.status(500).json({
                message: "Failed to create user",
                error: err.message
            });
        });
}
