import mongoose from "mongoose";
import slugify from "slugify";

const productReviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    uid:{ type: String },
    email:{ type: String,required: true },
    name: { type: String },
    userType:{ type: String },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    reply: {
      text: { type: String },
      repliedAt: { type: Date },
    },
    images: [{ type: String }], // Array for review images
    verifiedPurchase: { type: Boolean, default: false }, // True if user has purchased the product
    helpfulVotes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Track who found it helpful
  },
  { timestamps: true }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug:{type:String,required:false},
    brand: { type: String, required: true },
    shortDescription: { type: String, required: true },
    description: { type: String, required: true },
    reasonsToLove: { type: String },
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
    // NEW FIELD: Product Type
    productType: { type: String, enum: ["single", "variant","combo"], required: true },

    // Stock for Single Products
    stock: {
      type: Number,
      required: function () {
        return this.productType === "single";
      },
      default: 0,
    },

    // If productType is "variant", this will store sizes & inventory
    variants: {
      type: [
        {
          size: { type: String, required: true }, // Example: "L", "ML", "XL"
          inventory: { type: Number, required: true, default: 0 }, // Available stock
          offerprice: { type: Number, required: true }, // Price per size
          finalprice: { type: Number, required: true }, // Price per size
        },
      ],
      validate: {
        validator: function (v) {
          return this.productType === "variant" ? v.length > 0 : true;
        },
        message: "Variants required for productType 'variant'.",
      },
    },

    reviews: [productReviewSchema],

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
