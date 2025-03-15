import mongoose from "mongoose";

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: { 
          type: Number, 
          required: true, 
          min: 1, 
          default: 1 
        },
        activeSize: { 
          type: mongoose.Schema.Types.ObjectId, 
          ref: "Product.variants", 
          default: null 
        },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Cart", cartSchema);
