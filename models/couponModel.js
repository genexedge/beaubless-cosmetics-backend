import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true, // Optimized searching
      set: (value) => value.toUpperCase(), // Ensure uppercase
    },
    title: { type: String, required: true },
    description: { type: String, trim: true },
    startDate: { type: Date, required: true },
    expireDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return this.startDate < value;
        },
        message: "Expire date must be after start date.",
      },
    },
    discountType: { type: String, enum: ["flat", "percentage"], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    couponCategory: {
      type: String,
      enum: ["categoryBased", "productBased", "general", "festive"],
      required: true,
    },
    pid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: function () {
        return this.couponCategory === "productBased";
      },
    }, // Required if product-based
    cid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: function () {
        return this.couponCategory === "categoryBased";
      },
    }, // Required if category-based
    minOrderValue: { type: Number, default: 0 }, // Minimum order value required to apply
    maxDiscount: { type: Number, default: null }, // Max discount allowed (for percentage type)
    isActive: { type: Boolean, default: true }, // Whether the coupon is currently active
    maxUsage: { type: Number, default: 25 }, // Maximum times the coupon can be used
    usageCount: { type: Number, default: 0 }, // Track how many times it has been used
  },
  { timestamps: true }
);

export default mongoose.model("Coupon", couponSchema);
