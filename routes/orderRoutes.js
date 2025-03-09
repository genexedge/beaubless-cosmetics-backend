import express from "express";
import {
  createOrderController,
  verifyPaymentController,
  getAllOrder
} from "../controllers/orderController.js";
import { createOrderTwoController } from "../controllers/orderTwoController.js";

const router = express.Router();

router.post("/checkout", createOrderController);
router.post("/pay", createOrderTwoController);
router.post("/verify-payment", verifyPaymentController);
router.get('/get-all-order', getAllOrder);

export default router;
