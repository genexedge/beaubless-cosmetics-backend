import Cart from "../models/cartModel.js";
import Product from "../models/productModel.js";

// Controller to add a product to the cart
export const addToCartController = async (req, res) => {
  try {
    const { userId, productId, quantity } = req.body;

    // Validate request data
    if (!userId || !productId || !quantity) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if the product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if the user already has a cart
    let cart = await Cart.findOne({ userId });

    if (!cart) {
      // If no cart exists, create a new one
      cart = new Cart({ userId, products: [{ productId, quantity }] });
    } else {
      // Check if the product is already in the cart
      const existingProduct = cart.products.find(
        (item) => item.productId.toString() === productId
      );

      if (existingProduct) {
        // Update quantity if product exists
        existingProduct.quantity += quantity;
      } else {
        // Add new product to cart
        cart.products.push({ productId, quantity });
      }
    }

    await cart.save();
    res
      .status(200)
      .json({ success: true, message: "Product added to cart", cart });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error adding product to cart",
      error: error.message,
    });
  }
};

export const removeFromCartController = async (req, res) => {
  try {
    const { userId, productId } = req.body;

    // Validate request data
    if (!userId || !productId) {
      return res
        .status(400)
        .json({ message: "User ID and Product ID are required" });
    }

    // Find the cart for the user
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    // Filter out the product to remove it from the cart
    cart.products = cart.products.filter(
      (item) => item.productId.toString() !== productId
    );

    // If the cart is empty after removing the product, delete the cart
    if (cart.products.length === 0) {
      await Cart.findByIdAndDelete(cart._id);
      return res.status(200).json({
        success: true,
        message: "Product removed, cart deleted as it was empty",
      });
    }

    // Save the updated cart
    await cart.save();
    res
      .status(200)
      .json({ success: true, message: "Product removed from cart", cart });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error removing product to cart",
      error: error.message,
    });
  }
};
