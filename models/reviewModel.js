import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    email: { type: String, required: true }, // Email required instead of userId
    userName: { type: String, required: true }, // Store name for display
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    verifiedPurchase: { type: Boolean, default: false }, // Check if user bought the product
  },
  { timestamps: true }
);

const Review = mongoose.model("Review", reviewSchema);
export default Review;
