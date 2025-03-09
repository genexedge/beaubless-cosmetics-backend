import mongoose from "mongoose";

const BlogPostSchema = new mongoose.Schema({
  imgSrc: {
    type: String,
    required: true,
  },
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Blog = mongoose.model("Blogs", BlogPostSchema);

export default Blog;
