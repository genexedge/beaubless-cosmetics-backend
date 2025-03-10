import express from 'express';
import { createBlog, getAllBlogs, getBlogById, updateBlog, deleteBlog } from '../controllers/blogController.js';

const router = express.Router();
import upload from "../middlewares/multerConfig.js";
// Create Blog
router.post('/create',upload.array("image", 10), createBlog);

// Get All Blogs
router.get('/get-all-blog', getAllBlogs);

// Get Blog by ID
router.get('/:id', getBlogById);

// Update Blog
router.put('/update/:id', updateBlog);

// Delete Blog
router.delete('/delete/:id', deleteBlog);


export default router;
