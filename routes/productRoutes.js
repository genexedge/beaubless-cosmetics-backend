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
    createCategoryController,deleteCategoryController,addVariant,deleteVariant,updateVariant

} from "../controllers/productController.js";
import upload from "../middlewares/multerConfig.js";
import {createReview,getReviewsByProduct,updateReview,deleteReview,markReviewHelpful} from "../controllers/reviewController.js";

const router = express.Router(); // Creating an instance of Express Router to define routes

//routes create product route
router.post("/create-product", upload.array("image", 10), createProductController);
router.get("/get-all-product", getAllProductController); //get all product route

router.get("/get-all-categories", getAllCategoriesController);
router.post("/create-category", upload.array("image", 10), createCategoryController);

router.get("/get-single-product/:slug", getSingleProductController); //get single product route

router.put("/update-product/:pid",
// upload.array("image", 2),
updateProductController); //get single product route

router.delete("/delete-product/:pid", deleteProductController); //delete product route

//many products
router.post("/many-products", insertManyProductsController);
router.get("/get-products", getAllProductTwo);
router.delete("/delete-category/:pid", deleteCategoryController);



router.post("/createreview", createReview); // Create a new review
router.get("/review/:productId", getReviewsByProduct); // Get all reviews for a product
router.put("/review/:reviewId", updateReview); // Update a review
router.delete("/review/:productId/:reviewId", deleteReview); // Delete a review
router.post("/helpful/:reviewId", markReviewHelpful); // Mark a review as helpful

router.post('/:productId/variant', addVariant);
router.put("/:productId/variant/:variantId", updateVariant);
router.delete("/:productId/variant/:variantId", deleteVariant);
export default router;
