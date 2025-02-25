import express from "express";
import {
  createOrderController,
  verifyPaymentController,
} from "../controllers/orderController.js";
import { createOrderTwoController } from "../controllers/orderTwoController.js";

const router = express.Router();

router.post("/checkout", createOrderController);
router.post("/pay", createOrderTwoController);
router.post("/verify-payment", verifyPaymentController);

export default router;
