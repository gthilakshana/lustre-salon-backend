import User from "../models/user.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();


export const createUser = async (req, res) => {
  try {
    const { fullName, email, mobile, gender, password, confirmPassword, role } = req.body;

    if (!fullName || !email || !mobile || !gender || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { mobileNumber: mobile }] });
    if (existingUser) {
      return res.status(400).json({ message: "Email or Mobile already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName,
      email,
      mobileNumber: mobile,
      gender: gender.charAt(0).toUpperCase() + gender.slice(1),
      password: hashedPassword,
      role: role || "user",  
    });

    res.status(201).json({ message: `${role || "User"} created successfully`, user });
  } catch (err) {
    console.error("Error in createUser:", err.message, err.errors);
    res.status(500).json({ message: "Server error" });
  }
};




export async function loginUser(req, res) {
  try {
    const { email, mobile, password } = req.body;

    if (!email && !mobile) {
      return res.status(400).json({ message: "Email or mobile is required" });
    }

    const user = await User.findOne({
      $or: [{ email: email || null }, { mobileNumber: mobile || null }],
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    
    if (user.status === "blocked") {
      return res.status(403).json({ message: "Your account is blocked. Please contact admin." });
    }

    const isPasswordMatching = await bcrypt.compare(password, user.password);
    if (!isPasswordMatching)
      return res.status(401).json({ message: "Invalid email/mobile or password" });

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        image: user.image,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        mobileNumber: user.mobileNumber,
        role: user.role,
        status: user.status,         
        isEmailVerified: user.isEmailVerified,
        image: user.image,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}


export async function getUsers(req, res) {
  try {
    const { email, mobile, fullName } = req.query;

    let query = {};

    if (email) query.email = email;
    if (mobile) query.mobileNumber = mobile;
    if (fullName) query.fullName = new RegExp(fullName, "i"); 

    const users = await User.find(query).select("-password");

    if (!users.length && (email || mobile || fullName)) {
      return res.status(404).json({ message: "No users found" });
    }

    res.status(200).json(users);
  } catch (err) {
    console.error("Failed to fetch users:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
}


export async function forgotPassword(req, res) {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email is required" });

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "15m" });

        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
        await user.save();

        const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

       const transporter = nodemailer.createTransport({
       host: "smtp.gmail.com",
       port: 465,
       secure: true, 
       auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
          },
       });

        await transporter.sendMail({
            from: `"Lustre Salon" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Password Reset Request",
            html: `
                <h3>Password Reset Request</h3>
                <p>Click the link below to reset your password. This link is valid for 15 minutes:</p>
                <a href="${resetURL}">Reset Password</a>
            `,
        });

        res.status(200).json({ message: "Password reset link sent successfully" });
    } catch (err) {
        console.error("Forgot password error:", err);
        res.status(500).json({ message: "Server error" });
    }
}



export async function resetPassword(req, res) {
    try {
        const { token } = req.params;
        const { password, confirmPassword } = req.body;

        if (!password || !confirmPassword) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match" });
        }

        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(400).json({ message: "Invalid or expired reset link" });
        }

        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (
            user.resetPasswordToken !== token ||
            Date.now() > user.resetPasswordExpires
        ) {
            return res.status(400).json({ message: "Reset link has expired. Please request a new one." });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;

        // Clear reset token
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        return res.status(200).json({ message: "Password reset successfully. You can now log in." });
    } catch (err) {
        console.error("Reset password error:", err);
        res.status(500).json({ message: "Server error" });
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
    const { fullName, email, mobileNumber, status } = req.body;

    
    const [firstName, ...rest] = fullName.trim().split(" ");
    const lastName = rest.join(" ");

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { firstName, lastName, fullName, email, mobileNumber, status },
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
