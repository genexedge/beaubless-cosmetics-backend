import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import productRoutes from "./routes/productRoutes.js";
import blogRoutes from "./routes//blogRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import wishListRoutes from "./routes/wishListRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import couponRoutes from "./routes/couponRoutes.js";
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
app.use("/api/v1/blogs", blogRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/order", orderRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/wishlist", wishListRoutes);
app.use("/api/v1/", contactRoutes);
app.use("/api/v1/coupon", couponRoutes);

// Root Route
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Beaubless API</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            body {
                font-family: 'Inter', sans-serif;
                background: linear-gradient(135deg, #fef6f9, #e3f2fd);
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                color: #2e2e2e;
            }
            .container {
                background: #fff;
                padding: 50px 40px;
                border-radius: 16px;
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
                text-align: center;
                max-width: 600px;
                transition: transform 0.3s ease;
            }
            .container:hover {
                transform: translateY(-5px);
            }
            h1 {
                font-size: 2.5rem;
                margin-bottom: 15px;
                color: #c2185b;
            }
            p {
                font-size: 1.1rem;
                color: #555;
                margin-bottom: 30px;
            }
            .status {
                font-size: 1rem;
                color: #388e3c;
                font-weight: 600;
                background: #e8f5e9;
                padding: 10px 20px;
                border-radius: 8px;
                display: inline-block;
            }
            @media (max-width: 600px) {
                .container {
                    margin: 20px;
                    padding: 30px 20px;
                }
                h1 {
                    font-size: 2rem;
                }
                p {
                    font-size: 1rem;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>✨ Beaubless API</h1>
            <p>Welcome to the official API service of <strong>Beaubless Cosmetics</strong>. Your request was successful.</p>
            <div class="status">✅ API is running smoothly</div>
        </div>
    </body>
    </html>
  `);
});

app.use(cors());
// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
