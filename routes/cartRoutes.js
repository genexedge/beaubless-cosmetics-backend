import express from "express";
import {
  addToCartController,
  removeFromCartController,
} from "../controllers/cartController.js";

const router = express.Router();

router.post("/add-to-cart", addToCartController);
router.delete("/remove-from-cart", removeFromCartController);

export default router;
