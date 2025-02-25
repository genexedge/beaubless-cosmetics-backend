import express from "express";
import {
  createProductController,
  deleteProductController,
  getAllProductController,
  getAllProductTwo,
  getSingleProductController,
  insertManyProductsController,
  updateProductController,
} from "../controllers/productController.js";
import upload from "../middlewares/upload.js";

const router = express.Router(); // Creating an instance of Express Router to define routes

//routes

//create product route
router.post(
  "/create-product",
  upload.array("image", 2),
  createProductController
);

router.get("/get-all-product", getAllProductController); //get all product route

router.get("/get-single-product/:pid", getSingleProductController); //get single product route

router.put(
  "/update-product/:pid",
  upload.array("image", 2),
  updateProductController
); //get single product route

router.delete("/delete-product/:pid", deleteProductController); //delete product route

//many products
router.post("/many-products", insertManyProductsController);
router.get("/get-products", getAllProductTwo);

export default router;
