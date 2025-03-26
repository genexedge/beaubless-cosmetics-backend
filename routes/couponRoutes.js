import express from "express";
import {
  createCoupon,
  getAllCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  applyCoupon,
  deleteShipping,
  updateShipping,
  createShipping,
  getShippingById,
  getAllShippingOptions,
} from "../controllers/couponController.js";

const router = express.Router();

router.post("/create", createCoupon); // Create new coupon
router.get("/all", getAllCoupons); // Get all coupons
router.get("/:id", getCouponById); // Get coupon by ID
router.put("/:id", updateCoupon); // Update coupon
router.delete("/:id", deleteCoupon); // Delete coupon
router.post("/apply", applyCoupon); // Apply coupon to cart


// ---------------------Shipping Routes---------------------

// Get all shipping options
router.get("/shipping-options/all", getAllShippingOptions);

// Get a specific shipping option by ID
router.get("/shipping-options/:id", getShippingById);

// Create a new shipping option
router.post("/shipping-options", createShipping);

// Update an existing shipping option
router.put("/shipping-options/:id", updateShipping);

// Delete a shipping option
router.delete("/shipping-options/:id", deleteShipping);
export default router;
