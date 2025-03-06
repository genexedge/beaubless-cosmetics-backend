import mongoose from "mongoose";

const productReviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    user: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    reply: {
      text: { type: String },
      repliedAt: { type: Date },
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    images: [{ type: String }],
    verifiedPurchase: { type: Boolean, default: false },
    helpfulVotes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const ProductReview = mongoose.model("ProductReview", productReviewSchema);

export default ProductReview;
