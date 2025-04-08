import Coupon from "../models/couponModel.js";

export const applyCoupon = async (code, orderTotal) => {
  try {
    const coupon = await Coupon.findOne({ code, isActive: true });

    if (!coupon) {
      return { discountAmount: 0, error: "Invalid coupon code." };
    }

    const now = new Date();

    if (now < new Date(coupon.startDate) || now > new Date(coupon.expireDate)) {
      return { discountAmount: 0, error: "This coupon is expired or not yet active." };
    }

    if (orderTotal < coupon.minOrderValue) {
      return {
        discountAmount: 0,
        error: `Minimum order value must be ₹${coupon.minOrderValue} to use this coupon.`,
      };
    }

    let discountAmount = 0;

    if (coupon.discountType === "percentage") {
      discountAmount = (orderTotal * coupon.discountValue) / 100;
    } else if (coupon.discountType === "flat") {
      discountAmount = coupon.discountValue;
    }

    return { discountAmount, error: null };
  } catch (err) {
    console.error("Coupon application failed:", err);
    return { discountAmount: 0, error: "Something went wrong while applying the coupon." };
  }
};
