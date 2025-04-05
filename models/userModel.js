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
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
     lastName: {
      type: String,
      required: false,
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
    },
    role: {
      type: String,
      enum: ["superadmin", "admin", "user"],
      default: "user",
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
