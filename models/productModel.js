import mongoose from "mongoose";

// Define the schema for the product
const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    brand: { type: String, required: true },
    shortDescription: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    discount: {
      percentage: { type: Number, default: 0 },
      validUntil: { type: Date },
    },
    stock: { type: Number, required: true, default: 0 },
    images: [{ type: String }],
    shades: [
      {
        name: { type: String },
        hexCode: { type: String },
      },
    ],
    ingredients: [{ type: String }],
    ratings: {
      average: { type: Number, default: 0 },
      reviews: { type: Number, default: 0 },
    },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Create and export the Product model
const Product = mongoose.model("Product", productSchema);

export default Product;
