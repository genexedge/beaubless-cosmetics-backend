import express from "express";
import {
  createOrderController,
  verifyPaymentController,
  getAllOrder,
  updateOrderStatus,getOrderById,cancelOrder
} from "../controllers/orderController.js";
import { createOrderTwoController } from "../controllers/orderTwoController.js";

const router = express.Router();

router.post("/checkout", createOrderController);
router.post("/pay", createOrderTwoController);
router.get("/verify-payment", verifyPaymentController);
router.get('/get-all-order', getAllOrder);
router.get('/getOrderById/:orderId', getOrderById);
router.put('/update-status', updateOrderStatus);

router.delete('/cancel-order/:orderId', cancelOrder);
export default router;
