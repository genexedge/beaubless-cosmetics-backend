import Product from "../models/productModel.js"; // Importing the Product model
import productSchema from "../models/productSchema.js";
import ProductCategory from "../models/ProductCategory.js";
import ProductReview from "../models/ProductReview.js";
import cloudinary from "../config/cloudinary.js"; // Ensure Cloudinary is configured
import fs from "fs";
// Route to create a new product with image upload
export const createProductController = async (req, res) => {
  try {
    console.log("Request Body:", req.body);
    console.log("Uploaded Files:", req.files);

    const imageUrls = req.files.map((file) => file.path); // Get Cloudinary URLs

    let {
      name,
      brand,
      slug,
      shortDescription,
      description,
      category,
      price,
      stock,
      discount = 0,
      ingredients,
      isFeatured,
      isOnSale,
      isNewArrival,
      shades,
      sizes
    } = req.body;

    if (!name || !brand || !description || !category || !price || !stock) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Convert discount to a number if it's sent as a string
    discount = Number(discount);

    // Calculate offerPrice after discount
    let offerPrice = price;
    if (discount > 0) {
      offerPrice = price - (price * discount) / 100;
    }

    // Calculate finalPrice (assuming no additional tax/shipping for now)
    let finalPrice = offerPrice; // Modify as needed if tax/shipping applies

    // Create new product instance
    const newProduct = new Product({
      name,
      brand,
      slug,
      shortDescription,
      description,
      category,
      price,
      stock,
      discount: { percentage: discount },
      offerPrice,
      finalPrice,
      
      ingredients: ingredients ? ingredients.split(",") : [],
      shades: shades ? JSON.parse(shades) : [],
      sizes: sizes ? JSON.parse(sizes) : [],
      isFeatured: isFeatured === "true",
      isOnSale: isOnSale === "true",
      isNewArrival: isFeatured === "true",
      images: imageUrls, // Store Cloudinary URLs
    });

    await newProduct.save();
    res.status(201).json({ success: true, message: "Product created successfully!", product: newProduct });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
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
    console.log(error)
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
    console.log("Request Body:", req.body);
    console.log("Uploaded Files:", req.files);

    const { pid } = req.params; // Get product ID from URL

    let {
      name,
      brand,
      slug,
      shortDescription,
      description,
      category,
      price,
      stock,
      discount,
      ingredients,
      isFeatured,
      isOnSale,
      isNewArrival,
      shades,
      sizes
    } = req.body;

    // Find the existing product
    let product = await Product.findById(pid);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Handle images: Keep old ones if no new ones are uploaded
    const imageUrls = req.files.length > 0 ? req.files.map((file) => file.path) : product.images;

    // Convert discount to a number
    discount = discount !== undefined ? Number(discount) : product.discount.percentage;

    // Calculate offerPrice after discount
    let newPrice = price !== undefined ? Number(price) : product.price;
    let offerPrice = discount > 0 ? newPrice - (newPrice * discount) / 100 : newPrice;
    let finalPrice = offerPrice; // Modify as needed for tax/shipping

    // Update the product
    product = await Product.findByIdAndUpdate(
      pid,
      {
        name: name || product.name,
        brand: brand || product.brand,
        slug: slug || product.slug,
        shortDescription: shortDescription || product.shortDescription,
        description: description || product.description,
        category: category || product.category,
        price: newPrice,
        stock: stock !== undefined ? stock : product.stock,
        discount: { percentage: discount },
        offerPrice,
        finalPrice,
        ingredients: ingredients ? ingredients.split(",") : product.ingredients,
        shades: shades ? JSON.parse(shades) : product.shades,
        sizes: sizes ? JSON.parse(sizes) : product.sizes,
        isFeatured: isFeatured !== undefined ? isFeatured === "true" : product.isFeatured,
        isOnSale: isOnSale !== undefined ? isOnSale === "true" : product.isOnSale,
        isNewArrival: isNewArrival !== undefined ? isNewArrival === "true" : product.isNewArrival,
        images: imageUrls,
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, message: "Product updated successfully", product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};



// Route to delete a product


export const deleteProductController = async (req, res) => {
  try {
    const { pid } = req.params; // Get product ID from URL

    // Check if the product exists
    const product = await Product.findById(pid);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Delete associated images from Cloudinary
    for (const imageUrl of product.images) {
      try {
        // Extract public ID from Cloudinary URL (assuming standard structure)
        const publicId = imageUrl.split("/").pop().split(".")[0]; // Extract file name without extension

        // Delete from Cloudinary
        await cloudinary.uploader.destroy(`beaubless/${publicId}`); // Folder name added
        console.log(`Deleted from Cloudinary: ${publicId}`);
      } catch (cloudinaryError) {
        console.error("Cloudinary Deletion Error:", cloudinaryError);
      }
    }

    // Delete the product from the database
    await Product.findByIdAndDelete(pid);

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting product:", error);
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

// Create Product Category
export const createCategoryController = async (req, res) => {
  try {
    console.log("Request Body:", req.body);
    console.log("Uploaded Files:", req.files);
    const imageUrls = req.files.map((file) => file.path); // Get Cloudinary URLs
    const { name, description, parentCategory, image, metaTitle, metaDescription, metaKeywords } = req.body;

    const category = new ProductCategory({
      name,
      description,
      parentCategory,
      image: imageUrls, // Store Cloudinary URLs,
      metaTitle,
      metaDescription,
      metaKeywords,
    });

    await category.save();

    res.status(201).send({
      success: true,
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    res.status(400).send({
      log:req.body,
      success: false,
      message: "Error creating category",
      error,
    });
  }
};

// Get All Categories
export const getAllCategoriesController = async (req, res) => {
  try {
    const categories = await ProductCategory.find().populate("parentCategory");

    res.status(200).send({
      success: true,
      message: "All Categories",
      categories,
    });
  } catch (error) {
    res.status(400).send({
      success: false,
      message: "Error fetching categories",
      error,
    });
  }
};

// Get Single Category
export const getCategoryController = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await ProductCategory.findById(id).populate("parentCategory");

    if (!category) {
      return res.status(404).send({
        success: false,
        message: "Category not found",
      });
    }

    res.status(200).send({
      success: true,
      message: "Category fetched successfully",
      category,
    });
  } catch (error) {
    res.status(400).send({
      success: false,
      message: "Error fetching category",
      error,
    });
  }
};

// Update Category
export const updateCategoryController = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedCategory = await ProductCategory.findByIdAndUpdate(id, req.body, { new: true });

    res.status(200).send({
      success: true,
      message: "Category updated successfully",
      updatedCategory,
    });
  } catch (error) {
    res.status(400).send({
      success: false,
      message: "Error updating category",
      error,
    });
  }
};

// Delete Category
export const deleteCategoryController = async (req, res) => {
  try {
    const { pid } = req.params;
console.log(pid);

    // Find category first
    const category = await ProductCategory.findById(pid);
    if (!category) {
      return res.status(404).send({
        success: false,
        message: "Category not found",
      });
    }

    // Delete image from Cloudinary
    for (const imageUrl of category.image) {
      try {
        // Extract public ID from Cloudinary URL (assuming standard structure)
        const publicId = imageUrl.split("/").pop().split(".")[0]; // Extract file name without extension

        // Delete from Cloudinary
        await cloudinary.uploader.destroy(`beaubless/${publicId}`); // Folder name added
        console.log(`Deleted from Cloudinary: ${publicId}`);
      } catch (cloudinaryError) {
        console.error("Cloudinary Deletion Error:", cloudinaryError);
      }
    }

    // Delete category from database
    await ProductCategory.findByIdAndDelete(pid);

    res.status(200).send({
      success: true,
      message: "Category and associated image deleted successfully",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Error deleting category",
      error: error.message,
    });
  }
};

