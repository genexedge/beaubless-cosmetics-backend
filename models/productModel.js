import mongoose from "mongoose";
import slugify from "slugify";
const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug:{type:String,required:false},
    brand: { type: String, required: true },
    shortDescription: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "ProductCategory" },
    price: { type: Number, required: true }, // Original price
    discount: {
      percentage: { type: Number, default: 0 },
      validUntil: { type: Date },
    },
    offerPrice: { type: Number, required: true }, // Price after discount
    finalPrice: { type: Number, required: true }, // Price after tax/shipping
    stock: { type: Number, required: true, default: 0 },
    images: [{ type: String }],
    shades: [
      {
        name: { type: String },
        hexCode: { type: String },
      },
    ],
    ingredients: [{ type: String }],
    sizes: [{ type: String }], // XS, S, M, L, etc.
    ratings: {
      average: { type: Number, default: 0 },
      reviews: { type: Number, default: 0 },
    },
    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "ProductReview" }],

    isFeatured: { type: Boolean, default: false },
    isOnSale: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
  },
  { timestamps: true }
);
// Middleware to generate slug before saving
productSchema.pre("save", function (next) {
    if (!this.slug) {
        this.slug = slugify(this.name, { lower: true, strict: true });
    }
    next();
});

const Product = mongoose.model("Product", productSchema);
export default Product;
