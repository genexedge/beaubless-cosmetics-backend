import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import productRoutes from "./routes/productRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import wishListRoutes from "./routes/wishListRoutes.js";

// .env file configuaration
dotenv.config();

//database connection
connectDB();

//rest object
const app = express();

// middleware
app.use(cors());
app.use(express.json());

// Serve uploaded images statically
app.use("/uploads", express.static("uploads"));

// routes
app.get("/", (req, res) => {
  res.send("Hello World!");
});
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/order", orderRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/wishlist", wishListRoutes);

app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
