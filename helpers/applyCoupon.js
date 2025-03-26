import Coupon from "../models/couponModel.js";

export const applyCoupon = async (activeCouponCode, calculatedTotal) => {
  // If no coupon is applied, just return a discount of 0 and proceed.
  if (!activeCouponCode) {
    return { discountAmount: 0, error: null }; // ✅ No error, just no discount
  }

  const coupon = await Coupon.findOne({ code: activeCouponCode });

  if (!coupon) {
    return { discountAmount: 0, error: "Invalid coupon code" };
  }

  if (!coupon.isActive) {
    return { discountAmount: 0, error: "This coupon is no longer active" };
  }

  // const currentDate = new Date();
  // if (currentDate < coupon.startDate || currentDate > coupon.expireDate) {
  //   return { discountAmount: 0, error: "Coupon is expired or not yet valid" };
  // }

  // if (coupon.usageCount >= coupon.maxUsage) {
  //   return { discountAmount: 0, error: "Coupon usage limit exceeded" };
  // }

  // // Check if coupon applies to order
  // if (coupon.minOrderValue && calculatedTotal < coupon.minOrderValue) {
  //   return {
  //     discountAmount: 0,
  //     error: `Minimum order value of ₹${coupon.minOrderValue} required`,
  //   };
  // }

  let discountAmount = 0;

  if (coupon.discountType === "flat") {
    discountAmount = coupon.discountValue;
  } else if (coupon.discountType === "percentage") {
    discountAmount = (calculatedTotal * coupon.discountValue) / 100;
    discountAmount = Math.min(discountAmount, coupon.maxDiscount || discountAmount);
  }

  return { discountAmount, error: null };
};
