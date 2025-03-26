import Coupon from "../models/couponModel.js";
import ShippingOption from "../models/shippingModel.js";

// ✅ Create a new coupon

export const createCoupon = async (req, res) => {
  try {
    const { code, pid, cid, startDate, expireDate, discountValue, minOrderValue, maxDiscount, maxUsage, isActive, ...otherFields } = req.body;

    // Check if the coupon code already exists
    const existingCoupon = await Coupon.findOne({ code });
    if (existingCoupon) {
      return res.status(400).json({ success: false, message: "Coupon code already exists!" });
    }

    // Ensure startDate is before expireDate
    if (new Date(startDate) >= new Date(expireDate)) {
      return res.status(400).json({ success: false, message: "Expire date must be after start date." });
    }

    // Convert fields to proper types
    const newCoupon = new Coupon({
      ...otherFields,
      code: code.toUpperCase().trim(), // Ensure uppercase code
      startDate: new Date(startDate),
      expireDate: new Date(expireDate),
      discountValue: Number(discountValue),
      minOrderValue: Number(minOrderValue),
      maxDiscount: Number(maxDiscount),
      maxUsage: Number(maxUsage),
      isActive: isActive === "true" || isActive === true, // Convert to boolean
      pid: pid && pid !== "" ? pid : undefined, // Avoid BSONError
      cid: cid && cid !== "" ? cid : undefined, // Avoid BSONError
    });

    // Save coupon to database
    await newCoupon.save();
    res.status(201).json({ success: true, message: "Coupon created successfully!", coupon: newCoupon });

  } catch (error) {
    console.error("Error creating coupon:", error);
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



// -------------------Shipping------------------------------

// Get all shipping options
export const getAllShippingOptions = async (req, res) => {
  try {
    const shippingOptions = await ShippingOption.find();
    res.status(200).json({ success: true, data: shippingOptions });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error", error });
  }
};

// Get a single shipping option by ID
export const getShippingById = async (req, res) => {
  try {
    const shipping = await ShippingOption.findById(req.params.id);
    if (!shipping) {
      return res.status(404).json({ success: false, message: "Shipping option not found" });
    }
    res.status(200).json({ success: true, data: shipping });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error", error });
  }
};

// Create a new shipping option
export const createShipping = async (req, res) => {
  try {
    const { type, charges, name } = req.body;
    const newShipping = new ShippingOption({ type, charges, name });
    await newShipping.save();
    res.status(201).json({ success: true, data: newShipping });
  } catch (error) {
    res.status(400).json({ success: false, message: "Error creating shipping option", error });
  }
};

// Update an existing shipping option
export const updateShipping = async (req, res) => {
  try {
    const updatedShipping = await ShippingOption.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedShipping) {
      return res.status(404).json({ success: false, message: "ShippingOption option not found" });
    }

    res.status(200).json({ success: true, data: updatedShipping });
  } catch (error) {
    res.status(400).json({ success: false, message: "Error updating shipping option", error });
  }
};

// Delete a shipping option
export const deleteShipping = async (req, res) => {
  try {
    const deletedShipping = await ShippingOption.findByIdAndDelete(req.params.id);
    if (!deletedShipping) {
      return res.status(404).json({ success: false, message: "ShippingOption option not found" });
    }
    res.status(200).json({ success: true, message: "Shipping option deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting shipping option", error });
  }
};

  
