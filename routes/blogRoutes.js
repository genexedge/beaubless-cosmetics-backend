import express from 'express';
import {
  createBlog,
  getAllBlogs,
  getBlogBySlug,
  updateBlog,
  deleteBlog,
  addComment,
  deleteComment,
  editComment,
} from '../controllers/blogController.js';

import upload from "../middlewares/multerConfig.js";

const router = express.Router();

// Create Blog
router.post('/create', upload.array("image", 10), createBlog);

// Get All Blogs
router.get('/get-all-blogs', getAllBlogs);

// Get Blog by Slug
router.get('/:slug', getBlogBySlug);

// Update Blog
router.put('/update/:slug', updateBlog);

// Delete Blog
router.delete('/delete/:slug', deleteBlog);

// Add Comment
router.post('/:slug/comment', addComment);

// Delete Comment
router.delete('/:slug/comment/:commentId', deleteComment);

// Edit Comment
router.put('/:slug/comment/:commentId', editComment);



export default router;
