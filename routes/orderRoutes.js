import express from "express";
import {
  createOrderController,
  verifyPaymentController,
  getAllOrder,
  updateOrderStatus,getOrderById,cancelOrder,trackOrderById,getAllOrderByUser,
  testOrder
} from "../controllers/orderController.js";
import { createOrderTwoController } from "../controllers/orderTwoController.js";

const router = express.Router();

router.post("/checkout", createOrderController);
router.post("/pay", createOrderTwoController);
router.post("/verify-payment", verifyPaymentController);
router.get('/get-all-order', getAllOrder);
router.get('/user-order/:userId', getAllOrderByUser);
router.get('/order-details/:orderId', getOrderById);
router.put('/update-status', updateOrderStatus);
router.post("/track-order", trackOrderById);
router.delete('/cancel-order/:orderId', cancelOrder);
router.post('/test-order', testOrder);
export default router;
