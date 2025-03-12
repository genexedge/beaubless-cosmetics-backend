import mongoose from "mongoose";

const productReviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    user: {
      name: { type: String, required: true },
      email: { type: String, required: true }, // Only email check, no authentication required
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    reply: {
      text: { type: String },
      repliedAt: { type: Date },
    },
    images: [{ type: String }], // Array for review images
    verifiedPurchase: { type: Boolean, default: false }, // True if user has purchased the product
    helpfulVotes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const ProductReview = mongoose.model("ProductReview", productReviewSchema);
export default ProductReview;
