import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import productRoutes from "./routes/productRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import wishListRoutes from "./routes/wishListRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import multer from "multer";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";

// Environment configuration
dotenv.config();

// Database connection
connectDB();

// Rest object
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));


// Routes
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/order", orderRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/wishlist", wishListRoutes);
app.use("/api/v1/", contactRoutes);

// Root Route
app.get("/", (req, res) => {
  res.send("API is running successfully!");
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
