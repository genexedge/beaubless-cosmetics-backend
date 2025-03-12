import express from "express";
import { submitReview, getProductReviews, updateReview, deleteReview } from "../controllers/reviewController.js";

const router = express.Router();

// ✅ Submit a review (with email verification)
router.post("/submit", submitReview);

// ✅ Get all reviews for a specific product
router.get("/:productId", getProductReviews);

// ✅ Update a review (User can update their own review)
router.put("/:reviewId", updateReview);

// ✅ Delete a review (User can delete their own review or admin can delete)
router.delete("/:reviewId", deleteReview);

export default router;
