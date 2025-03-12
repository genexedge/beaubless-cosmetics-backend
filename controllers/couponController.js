import Coupon from "../models/couponModel.js";

// ✅ Create a new coupon
export const createCoupon = async (req, res) => {
    try {
      const { code } = req.body;
  
      // Check if the coupon code already exists
      const existingCoupon = await Coupon.findOne({ code });
      if (existingCoupon) {
        return res.status(400).json({ success: false, message: "Coupon code already exists!" });
      }
  
      // Create and save the new coupon
      const coupon = new Coupon(req.body);
      await coupon.save();
  
      res.status(201).json({ success: true, message: "Coupon created successfully!", coupon });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
  

// ✅ Get all coupons
export const getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, coupons });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Get a single coupon by ID
export const getCouponById = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found" });
    
    res.status(200).json({ success: true, coupon });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Update coupon details
export const updateCoupon = async (req, res) => {
  try {
    const updatedCoupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedCoupon) return res.status(404).json({ success: false, message: "Coupon not found" });

    res.status(200).json({ success: true, message: "Coupon updated successfully!", updatedCoupon });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Delete a coupon
export const deleteCoupon = async (req, res) => {
  try {
    const deletedCoupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!deletedCoupon) return res.status(404).json({ success: false, message: "Coupon not found" });

    res.status(200).json({ success: true, message: "Coupon deleted successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Apply a coupon (Validation)
export const applyCoupon = async (req, res) => {
    try {
      const { code } = req.body;
  
      // Find the coupon
      const coupon = await Coupon.findOne({ code });
  
      if (!coupon) {
        return res.status(404).json({ success: false, message: "Coupon not found!" });
      }
  
      // Check if the coupon is active
      if (!coupon.isActive) {
        return res.status(400).json({ success: false, message: "This coupon is no longer active!" });
      }
  
      // Check if the coupon has expired
      if (new Date() > coupon.expireDate) {
        return res.status(400).json({ success: false, message: "This coupon has expired!" });
      }
  
      // Check if the usage limit is reached
      if (coupon.usageCount >= coupon.maxUsage) {
        return res.status(400).json({ success: false, message: "This coupon has already been used by 25 people!" });
      }
  
      // Increment the usage count
      coupon.usageCount += 1;
      await coupon.save();
  
      res.status(200).json({ success: true, message: "Coupon applied successfully!", discount: coupon.discountValue });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
  
