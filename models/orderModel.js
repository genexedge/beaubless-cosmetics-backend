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
      country: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      street: { type: String, required: true },
      pincode: { type: String, required: true },
    },

    cartProducts: [
      {
        productId : { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        name: { type: String, required: true },
        brand: { type: String },
        shortDescription: { type: String },
        description: { type: String },
        category: { type: String },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
        discount: {
          percentage: { 
            type: Number, 
            default: 0,
            min: 0, 
            max: 100, // Ensure discount doesn't exceed 100%
          },
          validUntil: { type: Date },
        },
        images: [{ type: String }],
      },
    ],

    totalPrice: { type: Number, required: true },
    note: { type: String, default: "" },
      paymentMethod: { type: String, required: true },
      activeCoupon: {},
      discountDetails:{},
      selectedShippingOption:{},
      orderStatus: {
        type: String,
        enum: ["Pending", "Processing", "Shipped", "Delivered", "Completed", "Cancelled"],
        default: "Pending",
      },

      // ✅ Track Order Status History
      statusHistory: [
        {
          status: {
            type: String,
            enum: ["Pending", "Processing", "Shipped", "Delivered", "Completed", "Cancelled"],
          },
          updatedAt: { type: Date, default: Date.now }, // Timestamp of status change
        },
      ],

      paymentStatus: {
        type: String,
        enum: ["Pending", "Paid", "Failed","COD"],
        default: "Pending",
      },
      phonepeTransactionId: { type: String },
      isGuestOrder: { type: Boolean, default: false }, // Differentiates guest orders
    },
    { timestamps: true }
  );

// ✅ Automatically add first status in history when creating a new order
orderSchema.pre("save", function (next) {
  if (this.isNew) {
    this.statusHistory.push({ status: this.orderStatus });
  }
  next();
});

export default mongoose.model("Order", orderSchema);
