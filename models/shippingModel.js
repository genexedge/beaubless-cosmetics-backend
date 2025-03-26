import mongoose from "mongoose";

const shippingSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["express", "normal", "free"],
      required: true,
      unique: true,
    },
    charges: {
      type: Number,
      required: true,
      min: 0,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);
export default mongoose.model("shippingOption", shippingSchema);
