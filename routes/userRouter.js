
import express from "express";  
import { createUser, loginUser, deleteUser, getUsers, updateUser  } from "../controllers/userController.js";

const userRouter = express.Router();


userRouter.post("/", createUser);
userRouter.post("/signup", createUser);
userRouter.post("/login", loginUser);
userRouter.get("/", getUsers);
userRouter.delete("/:id", deleteUser);
userRouter.put("/:id", updateUser);

export default userRouter;
