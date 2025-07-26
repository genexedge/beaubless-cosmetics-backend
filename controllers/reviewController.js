import Product from "../models/productModel.js";  // Assuming Product model includes productReviewSchema
import mongoose from "mongoose";
import User from "../models/userModel.js";
import Order from "../models/orderModel.js";
// ✅ 1️⃣ Create a new review                                                                                                        
 

export const createReview = async (req, res) => {
  try {
    const { product, email, userName, rating, comment } = req.body;

    // Validate product ID
    if (!mongoose.Types.ObjectId.isValid(product)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    // Confirm product exists
    const productData = await Product.findById(product);
    if (!productData) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Create review object
    const newReview = {
      product,
      email,
      name: userName,
      rating,
      comment,
    };

    // Push to product's reviews array
    productData.reviews.push(newReview);
    await productData.save();

    return res.status(201).json({ message: "Review added successfully!", review: newReview });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ✅ ⿢ Get all reviews for a specific product
export const getReviewsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    const productData = await Product.findById(productId).select("reviews");
    if (!productData) return res.status(404).json({ error: "Product not found" });

    return res.status(200).json({ reviews: productData.reviews });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ✅ 3️⃣ Update a review (Only by the user who wrote it)
export const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { uid, rating, comment, images } = req.body;

    const productData = await Product.findOne({ "reviews._id": reviewId });
    if (!productData) return res.status(404).json({ error: "Review not found" });

    const review = productData.reviews.id(reviewId);

    if (review.uid !== uid) {
      return res.status(403).json({ error: "Unauthorized: You can only edit your own review" });
    }

    review.rating = rating || review.rating;
    review.comment = comment || review.comment;
    review.images = images || review.images;
    await productData.save();

    return res.status(200).json({ message: "Review updated successfully!", review });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ✅ 4️⃣ Delete a review (Only by the user who wrote it)

export const deleteReview = async (req, res) => {
  try {
    const { productId, reviewId } = req.params;

    // 1. Find the product
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: "Product not found" });

    // 2. Check if review exists
    const review = product.reviews.id(reviewId);
    if (!review) return res.status(404).json({ error: "Review not found" });

    // 3. Remove review
    product.reviews.pull(reviewId);
    await product.save();

    return res.status(200).json({ success:true,message: "Review deleted successfully!" });
  } catch (error) {
    console.error("Delete review error:", error);
    return res.status(500).json({ success:false,error: error.message });
  }
};



// ✅ 5️⃣ Mark a review as helpful
export const markReviewHelpful = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { userId } = req.body;

    const productData = await Product.findOne({ "reviews._id": reviewId });
    if (!productData) return res.status(404).json({ error: "Review not found" });

    const review = productData.reviews.id(reviewId);

    if (!review.helpfulVotes.includes(userId)) {
      review.helpfulVotes.push(userId);
    } else {
      review.helpfulVotes = review.helpfulVotes.filter(id => id.toString() !== userId);
    }

    await productData.save();
    return res.status(200).json({ message: "Vote updated!", helpfulVotes: review.helpfulVotes.length });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
