import Blog from "../models/blogsModel.js";
import cloudinary from "../config/cloudinary.js"; // Ensure Cloudinary is configured
import fs from "fs";

// Create Blog Post
export const createBlog = async (req, res) => {
  try {
    console.log("Request Body:", req.body);
    console.log("Uploaded Files:", req.files);

    // Upload images to Cloudinary
    const imageUrls = req.files && req.files.length > 0 ? req.files.map((file) => file.path) : req.body.images || [];

    const blog = new Blog({
      title: req.body.title,
      slug: req.body.slug,
      date: req.body.date,
      author:req.body.author,
      category: req.body.category,
      description: req.body.description,
      image: imageUrls, // Store array of images
    });

    await blog.save();
    res.status(201).json({ message: "Blog created successfully", blog });
  } catch (error) {
    console.error("Error creating blog:", error);
    res.status(400).json({ message: "Failed to create blog", error });
  }
};

// Get All Blog Posts
export const getAllBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
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
    console.log(req.params);
    console.log(req.body);
    const { id } = req.params;
    console.log("Updating blog with ID:", id);
    
    const blog = await Blog.findById(id);
    
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    let updatedImageUrls = blog.image; // Keep existing images if no new ones are uploaded

    if (req.files && req.files.length > 0) {
      // Delete old images from Cloudinary
      if (blog.image && blog.image.length > 0) {
        for (const imageUrl of blog.image) {
          try {
            const publicId = imageUrl.split("/").pop().split(".")[0];
            await cloudinary.uploader.destroy(`beaubless/${publicId}`);
          } catch (cloudinaryError) {
            console.error("Cloudinary Deletion Error:", cloudinaryError);
          }
        }
      }

      // Upload new images to Cloudinary
      updatedImageUrls = await Promise.all(
        req.files.map(async (file) => {
          const result = await cloudinary.uploader.upload(file.path, { folder: "beaubless" });
          return result.secure_url;
        })
      );
    }

    // Update blog with new data
    const updatedBlog = await Blog.findByIdAndUpdate(
      id,
      { ...req.body, image: updatedImageUrls },
      { new: true, runValidators: true }
    );

    res.status(200).json({ message: "Blog updated successfully", blog: updatedBlog });
  } catch (error) {
    console.error("Error updating blog:", error);
    res.status(500).json({ message: "Failed to update blog", error: error.message });
  }
};


// Delete Blog Post

export const deleteBlog = async (req, res) => {
  console.log("Request Params:", req.params);
  
  try {
      const { id } = req.params; // Corrected destructuring

      // Find the blog
      const blog = await Blog.findById(id);
      if (!blog) {
          return res.status(404).json({ message: "Blog not found" });
      }

      // Delete images from Cloudinary (if images exist)
      if (blog.image && Array.isArray(blog.image)) {
          for (const imageUrl of blog.image) {
              try {
                  const publicId = imageUrl.split("/").pop().split(".")[0];
                  await cloudinary.uploader.destroy(`beaubless/${publicId}`);
              } catch (cloudinaryError) {
                  console.error("Cloudinary Deletion Error:", cloudinaryError);
              }
          }
      }

      // Delete the blog from the database
      await Blog.findByIdAndDelete(id);

      res.status(200).json({ success: true, message: "Blog deleted successfully" });
  } catch (error) {
      console.error("Error deleting blog:", error);
      res.status(500).json({ message: "Failed to delete blog", error });
  }
};

// Get Blog by Slug
export const getBlogBySlug = async (req, res) => {
    try {
        const { slug } = req.params;

        // Find the blog by slug and include comments
        const blog = await Blog.findOne({ slug });

        if (!blog) {
            return res.status(404).json({ message: "Blog not found" });
        }

        res.status(200).json(blog);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch blog with comments", error });
    }
};


// Add Comment to Blog Post
export const addComment = async (req, res) => {
  try {
    const { slug } = req.params;
    const { user, text } = req.body;

    const blog = await Blog.findOne({ slug });
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    const newComment = {
      user,
      text,
      createdAt: new Date(),
    };

    blog.comments.push(newComment);
    await blog.save();

    res.status(200).json({ message: "Comment added successfully", blog });
  } catch (error) {
    res.status(500).json({ message: "Failed to add comment", error });
  }
};

// Delete Comment from Blog Post
export const deleteComment = async (req, res) => {
  try {
    const { slug, commentId } = req.params;

    const blog = await Blog.findOne({ slug });
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    blog.comments = blog.comments.filter((comment) => comment._id.toString() !== commentId);

    await blog.save();
    res.status(200).json({ message: "Comment deleted successfully", blog });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete comment", error });
  }
};

// Edit Comment
export const editComment = async (req, res) => {
  try {
    const { slug, commentId } = req.params;
    const { text } = req.body;

    const blog = await Blog.findOne({ slug });
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    const comment = blog.comments.find((comment) => comment._id.toString() === commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    comment.text = text; // Update the comment text
    comment.updatedAt = new Date();

    await blog.save();
    res.status(200).json({ message: "Comment updated successfully", blog });
  } catch (error) {
    res.status(500).json({ message: "Failed to update comment", error });
  }
};


