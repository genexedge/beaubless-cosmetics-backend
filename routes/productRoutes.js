import express from "express";
import {
    createProductController,
    deleteProductController,
    getAllProductController,
    getAllProductTwo,
    getSingleProductController,
    insertManyProductsController,
    updateProductController,
    getAllCategoriesController,
    createCategoryController,deleteCategoryController

} from "../controllers/productController.js";
import upload from "../middlewares/multerConfig.js";
import { deleteReview, getProductReviews, submitReview, updateReview } from "../controllers/reviewController.js";

const router = express.Router(); // Creating an instance of Express Router to define routes

//routes create product route
router.post("/create-product", upload.array("image", 10), createProductController);
router.get("/get-all-product", getAllProductController); //get all product route

router.get("/get-all-categories", getAllCategoriesController);
router.post("/create-category", upload.array("image", 10), createCategoryController);

router.get("/get-single-product/:pid", getSingleProductController); //get single product route

router.put("/update-product/:pid",
// upload.array("image", 2),
updateProductController); //get single product route

router.delete("/delete-product/:pid", deleteProductController); //delete product route

//many products
router.post("/many-products", insertManyProductsController);
router.get("/get-products", getAllProductTwo);
router.delete("/delete-category/:pid", deleteCategoryController);


// ✅ Submit a review (with email verification)
router.post("/review/submit", submitReview);

// ✅ Get all reviews for a specific product
router.get("/review/:productId", getProductReviews);

// ✅ Update a review (User can update their own review)
router.put("/review/:reviewId", updateReview);

// ✅ Delete a review (User can delete their own review or admin can delete)
router.delete("/review/:reviewId", deleteReview);

export default router;
