import express from "express";
import {
  addToCartController,
  clearCartController,
  getCartController,
  removeFromCartController,
  updateCartQuantityController,
} from "../controllers/cartController.js";

const router = express.Router();

router.post("/add-to-cart", addToCartController);
router.get("/get-cart", getCartController);
router.put("/update-quantity", updateCartQuantityController);
router.delete("/remove-from-cart", removeFromCartController);
router.post("/clear-cart", clearCartController);


export default router;
