import express from "express";
import {
  addToWishlistController,
  clearWishlistController,
  getWishlistController,
  removeFromWishlistController,
} from "../controllers/wishListController.js";

const router = express.Router();

router.post("/add-to-wishlist", addToWishlistController);
router.post("/remove-from-wishlist", removeFromWishlistController);
router.get("/get-wishlist/:userId", getWishlistController);
router.delete("/clear-wishlist/:userId", clearWishlistController);

export default router;
