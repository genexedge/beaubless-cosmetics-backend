import Wishlist from "../models/wishListModel.js";
import Product from "../models/productModel.js";

//controller for add-to-wishlist
export const addToWishlistController = async (req, res) => {
  try {
    const { userId, productId } = req.body;

    // Validate request
    if (!userId || !productId) {
      return res
        .status(400)
        .json({ message: "User ID and Product ID are required" });
    }

    // Check if the product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if the user already has a wishlist
    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      // If wishlist doesn't exist, create a new one
      wishlist = new Wishlist({ userId, products: [productId] });
    } else {
      // Prevent duplicate entries
      if (wishlist.products.includes(productId)) {
        return res.status(400).json({ message: "Product already in wishlist" });
      }
      wishlist.products.push(productId);
    }

    await wishlist.save();

    res.status(200).json({
      success: true,
      message: "Product added to wishlist successfully",
      wishlist,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error adding product to wishlist",
      error: error.message,
    });
  }
};

//controller for remove-from-wishlist
export const removeFromWishlistController = async (req, res) => {
  try {
    const { userId, productId } = req.body;

    // Validate request
    if (!userId || !productId) {
      return res
        .status(400)
        .json({ message: "User ID and Product ID are required" });
    }

    // Find the user's wishlist
    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      return res.status(404).json({ message: "Wishlist not found" });
    }

    // Check if the product exists in the wishlist
    const productIndex = wishlist.products.indexOf(productId);
    if (productIndex === -1) {
      return res.status(400).json({ message: "Product not found in wishlist" });
    }

    // Remove the product from the wishlist
    wishlist.products.splice(productIndex, 1);

    // If wishlist is empty after removal, delete the document (optional)
    if (wishlist.products.length === 0) {
      await Wishlist.deleteOne({ userId });
    } else {
      await wishlist.save();
    }

    res.status(200).json({
      success: true,
      message: "Product removed from wishlist successfully",
      wishlist,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error removing product from wishlist",
      error: error.message,
    });
  }
};

//controller for get-wishlist
export const getWishlistController = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate request
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Find wishlist for the user and populate product details
    const wishlist = await Wishlist.findOne({ userId }).populate("products");

    if (!wishlist) {
      return res.status(404).json({ message: "Wishlist not found" });
    }

    res.status(200).json({
      success: true,
      message: "Wishlist fetched successfully",
      wishlist,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching wishlist",
      error: error.message,
    });
  }
};

//controller for clear-wishlist
export const clearWishlistController = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate request
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Delete wishlist for the user
    const deletedWishlist = await Wishlist.findOneAndDelete({ userId });

    if (!deletedWishlist) {
      return res.status(404).json({ message: "Wishlist not found" });
    }

    res.status(200).json({
      success: true,
      message: "Wishlist cleared successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error clearing wishlist",
      error: error.message,
    });
  }
};
