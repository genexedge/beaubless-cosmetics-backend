import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
   {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    email: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String, required: true },

    address: {
      country: { type: String, required: false },
      city: { type: String, required: false },
      state: { type: String, required: false },
      street: { type: String, required: false },
      postalCode: { type: String, required: true },
    },

    cartProducts: [
      {
        id: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        name: { type: String, required: true },
        brand: { type: String },
        shortDescription: { type: String },
        description: { type: String },
        category: { type: String },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
        discount: {
          percentage: { type: Number, default: 0 },
          validUntil: { type: Date },
        },
        images: [{ type: String }],
      },
    ],

    totalPrice: { type: Number, required: true },
    note: { type: String, default: "" },
    paymentMethod: { type: String, required: true },
    orderStatus: {
      type: String,
      enum: ["Pending", "Completed", "Cancelled"],
      default: "Pending",
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed"],
      default: "Pending",
    },
    phonepeTransactionId: { type: String },
    isGuestOrder: { type: Boolean, default: false }, // Differentiates guest orders
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);