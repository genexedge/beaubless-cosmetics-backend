import Product from "../models/productModel.js"; // Importing the Product model
import productSchema from "../models/productSchema.js";

// Route to create a new product with image upload
export const createProductController = async (req, res) => {
  try {
    // Destructure required fields from request body
    const { name, brand, description, category, price, stock } = req.body;
    // Check if all required fields are provided
    if (!name || !brand || !description || !category || !price || !stock) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Extract uploaded image filenames and create file paths
    const images = req.files.map((file) => `/uploads/${file.filename}`);

    // Create a new product with provided data and uploaded images
    const newProduct = new Product({ ...req.body, images });

    // Save the product to the database
    await newProduct.save();

    // Send success response
    res.status(201).send({
      success: true,
      message: "Product Created Successfully",
      newProduct,
    });
  } catch (error) {
    // Handle errors and send failure response
    res.status(401).send({
      success: false,
      message: "Error in product Creation",
      error,
    });
  }
};

// Route to get all products
export const getAllProductController = async (req, res) => {
  try {
    // Fetch all products from the database
    const products = await Product.find();

    // Send success response with fetched products
    res.status(200).send({
      success: true,
      message: "All Products",
      products,
    });
  } catch (error) {
    // Handle errors and send failure response
    res.status(401).send({
      success: false,
      message: "Error in fetching products",
      error,
    });
  }
};

// Route to get single products
export const getSingleProductController = async (req, res) => {
  try {
    const { pid } = req.params;
    const product = await Product.findOne({ _id: pid });

    // Send success response with fetched products
    res.status(200).send({
      success: true,
      message: "Product",
      product,
    });
  } catch (error) {
    // Handle errors and send failure response
    res.status(401).send({
      success: false,
      message: "Error in fetch product",
      error,
    });
  }
};

// Route to update a product
export const updateProductController = async (req, res) => {
  try {
    const { pid } = req.params; // get product id from url
    const { name, brand, description, category, price, stock } = req.body;

    // Check if the product exists
    let product = await Product.findById(pid);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // If new images are uploaded, replace old images with new ones
    const images =
      req.files.length > 0
        ? req.files.map((file) => `/uploads/${file.filename}`)
        : product.images;

    // Update the product
    product = await Product.findByIdAndUpdate(
      pid,
      { name, brand, description, category, price, stock, images },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating product",
      error: error.message,
    });
  }
};

// Route to delete a product
export const deleteProductController = async (req, res) => {
  try {
    const { pid } = req.params; // Get product ID from URL

    // Check if the product exists
    const product = await Product.findById(pid);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // Delete associated images from the uploads folder
    product.images.forEach((imagePath) => {
      const fullPath = `.${imagePath}`; // Convert relative path to absolute
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath); // Delete file
      }
    });

    // Delete the product from the database
    await Product.findByIdAndDelete(pid);

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting product",
      error: error.message,
    });
  }
};

// Route to insert many products
export const insertManyProductsController = async (req, res) => {
  try {
    const products = await productSchema.insertMany(req.body);
    res.status(201).json({ message: "Products added successfully", products });
  } catch (error) {
    res.status(500).json({ message: "Failed to add products", error });
  }
};

export const getAllProductTwo = async (req, res) => {
  try {
    const products = await productSchema.find(); // Fetch all products
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch products", error });
  }
};
