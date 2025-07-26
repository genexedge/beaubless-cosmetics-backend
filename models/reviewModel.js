import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    email: { type: String, required: true },
    userName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    verifiedPurchase: { type: Boolean, default: false },
    images: [{ type: String }], // Array of image URLs or base64 strings
    profileImage: { type: String }, // Optional profile image URL or base64
  },
  { timestamps: true }
);

const Review = mongoose.model("Review", reviewSchema);
export default Review;
