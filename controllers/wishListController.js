import Wishlist from "../models/wishListModel.js";
import Product from "../models/productModel.js";

// Add to Wishlist
export const addToWishlistController = async (req, res) => {
  try {
    const { userId, productId } = req.body;

    if (!userId || !productId) {
      return res.status(400).json({ message: "User ID and Product ID are required" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

     // ✅ Check if wishlist already exists
    let wishlist = await Wishlist.findOne({ userId });

    // ✅ If not, create a new wishlist for the user
    if (!wishlist) {
      wishlist = new Wishlist({
        userId,
        products: [],
      });
    }

    // ✅ Add product to wishlist only if not already present
    if (!wishlist.products.includes(productId)) {
      wishlist.products.push(productId);
    }

    await wishlist.save();

    res.status(200).json({
      success: true,
      message: "Product added to wishlist",
      wishlist,
    });} catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Remove from Wishlist
export const removeFromWishlistController = async (req, res) => {
  try {
    const { userId, productId } = req.body;

    if (!userId || !productId) {
      return res.status(400).json({ message: "User ID and Product ID are required" });
    }

    const wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      return res.status(404).json({ message: "Wishlist not found" });
    }

    wishlist.products = wishlist.products.filter((id) => id.toString() !== productId);
    await wishlist.save();

    res.status(200).json({ success: true, message: "Product removed from wishlist", wishlist });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Wishlist
export const getWishlistController = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // ✅ Find wishlist or create an empty one
    let wishlist = await Wishlist.findOne({ userId }).populate("products");

    // ✅ If no wishlist found, create an empty wishlist and return it
    if (!wishlist) {
      wishlist = new Wishlist({
        userId,
        products: [],
      });

      await wishlist.save(); // Save the empty wishlist
    }

    res.status(200).json({ success: true, wishlist });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// Clear Wishlist
export const clearWishlistController = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const wishlist = await Wishlist.findOneAndDelete({ userId });

    if (!wishlist) {
      return res.status(404).json({ message: "Wishlist not found" });
    }

    res.status(200).json({ success: true, message: "Wishlist cleared successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
