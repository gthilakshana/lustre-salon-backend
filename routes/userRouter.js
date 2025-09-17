import express from "express";  
import { createUser, loginUser, getUsers, deleteUser, updateUser, forgotPassword , resetPassword } from "../controllers/userController.js";


const userRouter = express.Router();


userRouter.post("/", createUser);
userRouter.post("/register", createUser);
userRouter.post("/login", loginUser);
userRouter.get("/", getUsers);
userRouter.delete("/:id", deleteUser);
userRouter.put("/:id", updateUser);

userRouter.post("/forgot-password", forgotPassword);
userRouter.post("/reset-password/:token", resetPassword);

export default userRouter;
