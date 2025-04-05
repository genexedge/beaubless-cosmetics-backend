import Product from "../models/productModel.js";  // Assuming Product model includes productReviewSchema
import mongoose from "mongoose";
import User from "../models/userModel.js";
import Order from "../models/orderModel.js";
// ✅ 1️⃣ Create a new review

export const createReview = async (req, res) => {
  try {
    const { product, uid, email, rating, comment, images } = req.body;
    

    if (!mongoose.Types.ObjectId.isValid(product)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    // Check if product exists
    const productData = await Product.findById(product);
    if (!productData) return res.status(404).json({ error: "Product not found" });

    let userType = "guest";
    let name = "Anonymous"; // Default name

    // Check if email exists in the User table
    const user = await User.findOne({ email });

    if (user) {
      userType = "member";
      name = user.name || `${user.name}`.trim();
    } else {
      // If not found in User table, check if they purchased the product
      const order = await Order.findOne({ userEmail: email, "items.product": product });
      if (order) {
        userType = "member";
        name = `${order.firstName} ${order.lastName}`.trim();
      }
    }

    if (userType === "guest") {
      return res.status(403).json({ error: "You cannot post a review for this product as you haven't purchased it." });
    }

    // Ensure `userType` and `name` are included in the review object
    const newReview = { product, uid: uid || "anonymous", email, userType, name, rating, comment, images };
    console.log(newReview);
    productData.reviews.push(newReview);
    await productData.save();

    return res.status(201).json({ message: "Review added successfully!", review: newReview });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
// ✅ 2️⃣ Get all reviews for a specific product
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
    return res.status(500).json({ error: error.message });
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
    const { reviewId } = req.params;
    const { uid } = req.body;

    const productData = await Product.findOne({ "reviews._id": reviewId });
    if (!productData) return res.status(404).json({ error: "Review not found" });

    const review = productData.reviews.id(reviewId);

    if (review.uid !== uid) {
      return res.status(403).json({ error: "Unauthorized: You can only delete your own review" });
    }

    review.remove();
    await productData.save();

    return res.status(200).json({ message: "Review deleted successfully!" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
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
