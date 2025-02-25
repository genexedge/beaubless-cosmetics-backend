import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    price: { type: Number, required: true },
    imgSrc: { type: String },
    imgHover: { type: String },
    isOnSale: { type: Boolean, default: false },
    oldPrice: { type: Number },
    filterBrands: [{ type: String }],
    inStock: { type: Boolean, default: true },
    filterColor: [{ type: String }],
    filterSizes: [{ type: String }],
    tabFilterOptions2: [{ type: String }],
    tabFilterOptions: [{ type: String }],
    colors: [{ bgColor: String, imgSrc: String }],
  },
  { timestamps: true }
);

const Product = mongoose.model("AllProducts", productSchema);

export default Product;
