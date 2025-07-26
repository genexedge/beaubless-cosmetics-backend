import Product from "../models/productModel.js"; // Importing the Product model
import productSchema from "../models/productSchema.js";
import ProductCategory from "../models/ProductCategory.js";

import cloudinary from "../config/cloudinary.js"; // Ensure Cloudinary is configured
import fs from "fs";
// Route to create a new product with image upload
export const createProductController = async (req, res) => {
  try {
    console.log("Request Body:", req.body);
    console.log("Uploaded Files:", req.files);

    // Ensure uploaded images are stored correctly
    const imageUrls = req.files && req.files.length > 0 ? req.files.map((file) => file.path) : req.body.images || [];

    let {
      name,
      brand,
      slug,
      shortDescription,
      description,
      reasonsToLove,
      category,
      price,
      discount = 0,
      productType,
      stock,
      variants,
      ingredients,
      isFeatured,
      isOnSale,
      isNewArrival,
      shades
    } = req.body;

    // Convert required fields to the correct types
    discount = Number(discount);
    price = Number(price);

    // Validate required fields
    if (!name || !brand || !description || !category || !price || !productType) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    if (productType === "single") {
      if (!stock) {
        return res.status(400).json({ success: false, message: "Stock is required for single products" });
      }
    } else if (productType === "variant") {
      // ✅ Fix JSON Parsing Error
      if (!variants || (typeof variants === "string" ? JSON.parse(variants).length === 0 : variants.length === 0)) {
        return res.status(400).json({ success: false, message: "Variants are required for variant products" });
      }
      stock = undefined; // No stock field for variant products
    } else {
      return res.status(400).json({ success: false, message: "Invalid product type" });
    }

    // Calculate offerPrice
    let offerPrice = price;
    if (discount > 0) {
      offerPrice = price - (price * discount) / 100;
    }

    // Final price after all discounts
    let finalPrice = offerPrice;

    // ✅ Fix Ingredients Handling
    let parsedIngredients = [];
    if (typeof ingredients === "string") {
      parsedIngredients = ingredients.split(",").map((i) => i.trim());
    } else if (Array.isArray(ingredients)) {
      parsedIngredients = ingredients;
    }

    // ✅ Fix Shades Parsing
    let parsedShades = typeof shades === "string" ? JSON.parse(shades) : shades;

    // ✅ Fix Variants Parsing
    let parsedVariants = typeof variants === "string" ? JSON.parse(variants) : variants;

    // Create new product instance
    const newProduct = new Product({
      name,
      brand,
      slug,
      shortDescription,
      description,reasonsToLove,
      category,
      price,
      discount: { percentage: discount },
      offerPrice,
      finalPrice,
      productType,
      stock: productType === "single" ? stock : undefined,
      variants: productType === "variant" ? parsedVariants : undefined,
      ingredients: parsedIngredients,
      shades: parsedShades,
      isFeatured: isFeatured === "true",
      isOnSale: isOnSale === "true",
      isNewArrival: isNewArrival === "true",
      images: imageUrls,
    });

    await newProduct.save();
    res.status(201).json({ success: true, message: "Product created successfully!", product: newProduct });
  } catch (error) {
    console.error("Error:", error);
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

// Route to get single product by slug
export const getSingleProductController = async (req, res) => {
  try {
    console.log(req.params);
    
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({
        success: false,
        message: "Product slug is required",
      });
    }

    // Ensure we're querying by slug, not _id
    const product = await Product.findOne({ slug: slug }).populate("reviews");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Calculate total number of reviews
    const reviewCount = product.reviews.length;

    // Calculate average rating
    const totalRating = product.reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = reviewCount > 0 ? (totalRating / reviewCount).toFixed(1) : 0;

    res.status(200).json({
      success: true,
      message: "Product fetched successfully",
      product,
      reviewCount,
      averageRating,
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({
      success: false,
      message: "Error in fetching product",
      error: error.message,
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
    const imageUrls = req.files?.length > 0 ? req.files.map((file) => file.path) : product.images;

    // Convert price and stock to valid numbers
    const newPrice = price !== undefined ? Number(price) : product.price;
    const newStock = stock !== undefined ? Number(stock) : product.stock;

    // Convert discount to a valid number
    let discountPercentage = discount?.percentage ? Number(discount.percentage) : product.discount.percentage;
    if (isNaN(discountPercentage)) {
      discountPercentage = 0; // Default to 0 if invalid
    }

    // Calculate offerPrice after discount
    let offerPrice = discountPercentage > 0 ? newPrice - (newPrice * discountPercentage) / 100 : newPrice;
    let finalPrice = offerPrice; // Modify as needed for tax/shipping

    // Convert `ingredients` safely (ensure it's always an array)
    let newIngredients = Array.isArray(ingredients) ? ingredients : product.ingredients;

    // Convert `shades` and `sizes` safely (ensure they are arrays)
    let newShades = shades ? (Array.isArray(shades) ? shades : JSON.parse(shades)) : product.shades;
    let newSizes = sizes ? (Array.isArray(sizes) ? sizes : JSON.parse(sizes)) : product.sizes;

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
        stock: newStock,
        discount: { percentage: discountPercentage, validUntil: discount?.validUntil || product.discount.validUntil },
        offerPrice,
        finalPrice,
        ingredients: newIngredients,
        shades: newShades,
        sizes: newSizes,
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


// Get Products by Category
import mongoose from "mongoose";

export const getProductsByCategoryController = async (req, res) => {
  try {
    const { categoryId } = req.params;

    // Convert to ObjectId
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).send({
        success: false,
        message: "Invalid category ID",
      });
    }

    const products = await Product.find({
      category: new mongoose.Types.ObjectId(categoryId),
    });

    if (!products.length) {
      return res.status(404).send({
        success: false,
        message: "No products found for this category",
      });
    }

    res.status(200).send({
      success: true,
      message: "Products fetched by category",
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error fetching products by category",
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

export const addVariant = async (req, res) => {
  try {
    const { productId } = req.params;
    const { size, inventory, offerprice, finalprice } = req.body;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    const newVariant = {
      size,
      inventory: Number(inventory),
      offerprice: Number(offerprice),
      finalprice: Number(finalprice)
    };

    product.variants.push(newVariant);
    await product.save();

    return res.status(200).json({ success: true, message: "Variant added successfully" });

  } catch (error) {
    console.error("Error adding variant:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
export const updateVariant = async (req, res) => {
  try {
    const { productid, variantid } = req.params;
    const { size, inventory, offerprice, finalprice } = req.body;

    const product = await Product.findById(productid);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    const variant = product.variants.id(variantid);
    if (!variant) return res.status(404).json({ success: false, message: "Variant not found" });

    // Update fields
    if (size) variant.size = size;
    if (inventory) variant.inventory = Number(inventory);
    if (offerprice) variant.offerprice = Number(offerprice);
    if (finalprice) variant.finalprice = Number(finalprice);

    await product.save();

    res.status(200).json({ success: true, message: "Variant updated successfully" });
  } catch (error) {
    console.error("Error updating variant:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
export const deleteVariant = async (req, res) => {
  try {
    const { productId, variantId } = req.params;
console.log(req.params);

    const product = await Product.findOne({ _id: productId });
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Check if variant exists
    const variantExists = product.variants.some(
      (v) => v._id.toString() === variantId
    );
    if (!variantExists) {
      return res.status(404).json({ success: false, message: "Variant not found" });
    }

    // Remove variant by filtering
    product.variants = product.variants.filter(
      (v) => v._id.toString() !== variantId
    );

    await product.save();

    return res.status(200).json({ success: true, message: "Variant deleted successfully" });

  } catch (error) {
    console.error("Error deleting variant:", error.message);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

