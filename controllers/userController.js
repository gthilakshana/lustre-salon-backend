import User from "../models/user.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();


export async function createUser(req, res) {
  try {
    const newUserData = req.body;

   
    if (newUserData.role === "admin") {
      if (!req.user || req.user.role !== "admin") {
        return res
          .status(403)
          .json({ message: "Only administrators can create admin accounts" });
      }
    }

    
    newUserData.password = bcrypt.hashSync(newUserData.password, 10);

    const user = new User(newUserData);
    await user.save();

    return res
      .status(201)
      .json({ message: "User created successfully", userId: user._id });
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).json({ error: err.message });
  }
}


export async function loginUser(req, res) {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isPasswordMatching = bcrypt.compareSync(
      req.body.password,
      user.password
    );
    if (!isPasswordMatching) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    
    const token = jwt.sign(
      {
        id: user._id,
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
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}


export async function getUsers(req, res) {
  try {
    const users = await User.find().select("-password"); 
    res.json(users);
  } catch (err) {
    console.error("Failed to fetch users:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
}


export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await User.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res
      .status(500)
      .json({ message: "Error deleting user", error: error.message });
  }
};


export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { firstName, lastName, email },
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User updated successfully", user: updatedUser });
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ message: "Failed to update user", error: err.message });
  }
};



export function isAdmin(req) {
  if (!req.user) return false;
  return req.user.role === "admin";
}
