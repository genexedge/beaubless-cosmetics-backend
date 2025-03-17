import Cart from "../models/cartModel.js";
import Product from "../models/productModel.js";

// Controller to add a product to the cart
export const addToCartController = async (req, res) => {
  try {
    const { userId, productId, quantity, activeSize } = req.body;

    // Validate required fields
    if (!userId || !productId || !quantity) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if the product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Fetch the user's cart
    let cart = await Cart.findOne({ userId });

    // If cart doesn't exist, create a new one
    if (!cart) {
      cart = new Cart({
        userId,
        products: [{ productId, quantity, activeSize: activeSize || null }],
      });
    } else {
      // Check if the product with the same activeSize already exists
      const existingProductIndex = cart.products.findIndex(
        (item) =>
          item.productId.toString() === productId &&
          (activeSize ? item.activeSize?.toString() === activeSize : true)
      );

      if (existingProductIndex > -1) {
        // If product already in cart, update quantity
        cart.products[existingProductIndex].quantity += quantity;
      } else {
        // Add new product to cart
        cart.products.push({ productId, quantity, activeSize: activeSize || null });
      }
    }

    // Save the cart
    await cart.save();

    res.status(200).json({ success: true, message: "Product added to cart", cart });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error adding product to cart",
      error: error.message,
    });
  }
};

export const updateCartQuantityController = async (req, res) => {
  try {
    const { userId, productId, quantity, activeSize } = req.body;

    if (!userId || !productId || !quantity) {
      return res.status(400).json({ message: "User ID, Product ID, and Quantity are required" });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    console.log("Cart Products:", cart.products);
console.log("Product ID:", productId);
console.log("Active Size:", activeSize);
    // Find the product in the cart
    const productIndex = cart.products.findIndex(
  (item) => {
    console.log("Product ID Match:", item.productId.toString() === productId);
    console.log("Active Size Match:", item.activeSize.toString() === activeSize);
    return item.productId.toString() === productId &&
      (!activeSize || item.activeSize.toString() === activeSize);
  }
);


    if (productIndex === -1) {
      return res.status(404).json({ success: false, message: "Product not found in cart" });
    }

    // Update quantity
    cart.products[productIndex].quantity = quantity;

    // If quantity becomes zero, remove the product from the cart
    if (quantity <= 0) {
      cart.products.splice(productIndex, 1);
    }

    // If cart is empty, delete the cart
    if (cart.products.length === 0) {
      await Cart.findByIdAndDelete(cart._id);
      return res.status(200).json({
        success: true,
        message: "Product removed, cart deleted as it was empty",
      });
    }

    await cart.save();
    res.status(200).json({ success: true, message: "Cart updated successfully", cart });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating cart quantity",
      error: error.message,
    });
  }
};

export const getCartController = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Fetch the cart for the user
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(200).json({ success: true, cart:[] });
    }

    // Fetch product details and format each product
    const cartWithProductDetails = await Promise.all(
      cart.products.map(async (item) => {
        const product = await Product.findById(item.productId);
        if (!product) return null;

        // Format product data
        const variants = product.variants?.map((variant) => ({
          variantId: variant._id,
          size: variant.size || "Default Size",
          inventory: variant.inventory || 0,
          offerPrice:
            variant.offerprice ||
            product.offerPrice ||
            product.finalPrice ||
            product.price ||
            0,
          finalPrice: variant.finalprice || product.finalPrice || product.price || 0,
          category: product.category || "General",
        })) || [];

        const primaryVariant = variants[0] || {};

        const totalReviews = product.reviews?.length || 0;
        const averageRating = totalReviews
          ? (
              product.reviews.reduce((acc, review) => acc + (review.rating || 0), 0) /
              totalReviews
            ).toFixed(1)
          : 0;

        return {
          _id: product._id,
          name: product.name,
          slug: product.slug || "unknown-product",
          price: primaryVariant.finalPrice || product.finalPrice || product.price || 0,
          offerPrice:
            primaryVariant.offerPrice ||
            product.offerPrice ||
            product.finalPrice ||
            product.price ||
            0,
          images: product.images || [],
          stock: product.stock || primaryVariant.inventory || 0,
          brand: product.brand || "Unknown Brand",
          reviews: product.reviews || [],
          ratings: {
            average: Number(averageRating),
            totalReviews,
          },
          discount: product.discount || { percentage: 0, validUntil: null },
          description: product.description || "No description available",
          shortDescription: product.shortDescription || "",
          createdAt: product.createdAt || "",
          updatedAt: product.updatedAt || "",
          category: product.category || "General",
          variants,
          sizes: variants.map((v) => v.size) || ["Default"],
          filterBrands: product.brand ? [product.brand] : ["Generic"],
          filterColor: product.shades?.length ? product.shades : ["Default Color"],
          filterAvailability: product.stock > 0 ? "In Stock" : "Out of Stock",
          quantity: item.quantity,
          activeSize: item.activeSize || null,
        };
      })
    );

    const validCartItems = cartWithProductDetails.filter((item) => item !== null);

    res.status(200).json({
      success: true,
      cart: validCartItems,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching cart",
      error: error.message,
    });
  }
};


export const clearCartController = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }

    // Find the cart and delete it
    const cart = await Cart.findOneAndDelete({ userId });

    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    res.status(200).json({
      success: true,
      message: "Cart cleared successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error clearing cart",
      error: error.message,
    });
  }
};

export const removeFromCartController = async (req, res) => {
  try {
    const { userId, productId, activeSize } = req.body;

    if (!userId || !productId) {
      return res.status(400).json({ message: "User ID and Product ID are required" });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }
   const newCart = cart.products.filter((item) => {
  return item._id.toString() !== productId && item.activeSize.toString() !== activeSize;
});
    cart.products = newCart;
  
    if (cart.products.length === 0) {
      await Cart.findByIdAndDelete(cart._id);
      return res.status(200).json({
        success: true,
        message: "Product removed, cart deleted as it was empty",
      });
    }

    await cart.save();
    res.status(200).json({ success: true, message: "Product removed from cart", cart });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error removing product from cart",
      error: error.message,
    });
  }
};

