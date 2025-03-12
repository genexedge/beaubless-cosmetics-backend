import mongoose from "mongoose";

// Comment Schema
const CommentSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  comment: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Blog Schema
const BlogPostSchema = new mongoose.Schema({
  image: [{ type: String }], // Array of image URLs
  alt: {
    type: String,
    default: "",
  },
  date: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true, // Ensure slug is unique
  },
  description: {
    type: String,
    required: true,
  },
  description2: {
    type: String,
  },
  description3: {
    type: String,
  },
  delay: {
    type: String,
    default: "0s",
  },
  wowDelay: {
    type: String,
    default: "",
  },
  category: {
    type: String,
    required: true,
  },
  comments: [CommentSchema], // Embedded comments array
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Blog = mongoose.model("Blogs", BlogPostSchema);

export default Blog;
