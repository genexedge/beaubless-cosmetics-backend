import express from "express";
import {
  createCoupon,
  getAllCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  applyCoupon,
} from "../controllers/couponController.js";

const router = express.Router();

router.post("/create", createCoupon); // Create new coupon
router.get("/all", getAllCoupons); // Get all coupons
router.get("/:id", getCouponById); // Get coupon by ID
router.put("/:id", updateCoupon); // Update coupon
router.delete("/:id", deleteCoupon); // Delete coupon
router.post("/apply", applyCoupon); // Apply coupon to cart

export default router;
