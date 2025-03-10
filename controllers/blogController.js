import Blog from "../models/blogsModel.js";
import cloudinary from "../config/cloudinary.js"; // Ensure Cloudinary is configured
import fs from "fs";

// Create Blog Post
export const createBlog = async (req, res) => {
  try {
    console.log("Request Body:", req.body);
    console.log("Uploaded Files:", req.files);

    const imageUrls = req.files.map((file) => file.path); // Get Cloudinary URLs

    const blog = new Blog({
      title: req.body.title,
      slug: req.body.slug,
      date: req.body.date,
      category: req.body.category,
      description: req.body.description,
      image: imageUrls // Store array of images
    });

    await blog.save();
    res.status(201).json({ message: "Blog created successfully", blog });
  } catch (error) {
    res.status(400).json({ message: "Failed to create blog", error });
  }
};

// Get All Blog Posts
export const getAllBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find();
    res.status(200).json(blogs);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch blogs", error });
  }
};

// Get Blog by ID
export const getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }
    res.status(200).json(blog);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch blog", error });
  }
};

// Update Blog Post
export const updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }
    res.status(200).json({ message: "Blog updated successfully", blog });
  } catch (error) {
    res.status(500).json({ message: "Failed to update blog", error });
  }
};

// Delete Blog Post

export const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params; // Extract blog ID from URL

    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    // Delete images from Cloudinary (if they exist)
    if (blog.image && blog.image.length > 0) {
      for (const imageUrl of blog.image) {
        try {
          const publicId = imageUrl.split("/").pop().split(".")[0]; // Extract filename
          await cloudinary.uploader.destroy(`beaubless/${publicId}`);
          console.log(`Deleted from Cloudinary: ${publicId}`);
        } catch (cloudinaryError) {
          console.error("Cloudinary Deletion Error:", cloudinaryError);
        }
      }
    }

    // Delete blog from the database
    await Blog.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: "Blog deleted successfully" });
  } catch (error) {
    console.error("Error deleting blog:", error);
    res.status(500).json({ success: false, message: "Failed to delete blog", error });
  }
};

