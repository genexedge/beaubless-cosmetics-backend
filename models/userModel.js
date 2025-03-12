import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
  houseNo: { type: String, required: true },  // House Number or Apartment Number
  street: { type: String, required: true },   // Street Address
  landmark: { type: String },                 // Optional Landmark
  city: { type: String, required: true },     // City
  state: { type: String, required: true },    // State
  country: { type: String, required: true },  // Country
  pincode: { type: String, required: true },  // ZIP/Pincode
  isDefault: { type: Boolean, default: false } // Mark default address
});

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    addresses: [addressSchema],  // Now supports multiple addresses
    answer: {
      type: String,
      required: true,
    },
    role: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
