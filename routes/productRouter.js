import express from "express";
import { createProduct, getProducts, deleteProduct, updateProduct, getProductId } from "../controllers/productController.js";

const productRouter = express.Router();

productRouter.get("/", getProducts);
productRouter.post("/", createProduct);
productRouter.get("/search", (req, res) => {
    res.json({ message: "Searching!!" });
});
productRouter.delete("/:productID", deleteProduct);
productRouter.put("/:productID", updateProduct);
productRouter.get("/:productID", getProductId);



export default productRouter;