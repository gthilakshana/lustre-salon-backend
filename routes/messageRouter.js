import express from "express";
import { createMessage, getMessages, deleteMessage } from "../controllers/messageController.js";

const messageRouter = express.Router();


messageRouter.post("/", createMessage);
messageRouter.get("/", getMessages);
messageRouter.delete("/:messageId", deleteMessage);


export default messageRouter;
