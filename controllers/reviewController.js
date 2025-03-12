import ProductReview from "../models/reviewModel.js";
import Order from "../models/orderModel.js";
import mongoose from "mongoose";

// ✅ Submit a Review (Only if user has purchased the product)
export const submitReview = async (req, res) => {
  try {
    const { productId, email, userName, rating, comment, images } = req.body;

    if (!productId || !email || !rating || !comment || !userName) {
      return res.status(400).json({ message: "All fields are required." });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID." });
    }

    const productObjectId = new mongoose.Types.ObjectId(productId);
    console.log("Product ID from request:", productId);
    console.log("Converted Product Object ID:", productObjectId);

    // Check if the user has purchased the product
    const hasPurchased = await Order.exists({
      email,
      "items.productId": productObjectId,
      status: "Completed", // Ensure this matches your order schema
    });

    console.log("Has purchased:", hasPurchased);

    if (!hasPurchased) {
      return res.status(403).json({ message: "You have not purchased this product yet." });
    }

    const newReview = new ProductReview({
      product: productObjectId,
      user: { name: userName, email },
      rating,
      comment,
      verifiedPurchase: true,
      images: images || [],
      helpfulVotes: 0,
    });

    await newReview.save();
    res.status(201).json({ message: "Review submitted successfully!", review: newReview });
  } catch (error) {
    console.error("Error submitting review:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ✅ Get all reviews for a specific product
export const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID." });
    }

    const reviews = await ProductReview.find({ product: productId }).sort({ createdAt: -1 });

    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ✅ Update a review (User can edit their own review)
export const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { email, rating, comment, images } = req.body;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({ message: "Invalid review ID." });
    }

    // Find the review
    const review = await ProductReview.findById(reviewId);

    if (!review) {
      return res.status(404).json({ message: "Review not found." });
    }

    // Check if the email matches the review
    if (review.user.email !== email) {
      return res.status(403).json({ message: "You can only update your own review." });
    }

    // Update fields
    if (rating) review.rating = rating;
    if (comment) review.comment = comment;
    if (images) review.images = images;

    await review.save();
    res.status(200).json({ message: "Review updated successfully!", review });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ✅ Delete a review (Only admin OR user who wrote the review)
export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { email, userId, isAdmin } = req.body; // Assume userId is passed for logged-in users

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({ message: "Invalid review ID." });
    }

    // Find review
    const review = await ProductReview.findById(reviewId);

    if (!review) {
      return res.status(404).json({ message: "Review not found." });
    }

    // Check if the user is allowed to delete
    if (isAdmin || (userId && review.user.userId && review.user.userId.toString() === userId)) {
      await ProductReview.findByIdAndDelete(reviewId);
      return res.status(200).json({ message: "Review deleted successfully!" });
    } else {
      return res.status(403).json({ message: "You are not authorized to delete this review." });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

