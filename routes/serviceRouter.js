import express from "express";
import { createService, getServices, deleteService, updateService } from "../controllers/serviceController.js";

const serviceRouter = express.Router();

serviceRouter.post("/", createService);
serviceRouter.get("/", getServices);
serviceRouter.delete("/:id", deleteService);
serviceRouter.put("/:id", updateService);

export default serviceRouter;