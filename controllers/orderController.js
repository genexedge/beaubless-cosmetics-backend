import Cart from "../models/cartModel.js";
import Order from "../models/orderModel.js";
import axios from "axios";
import crypto from "crypto";
export const getAllOrder = async (req, res) => {
  try {
    const orders = await Order.find(); // Renamed variable to avoid conflict
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch orders", error });
  }
};
//controller for creating order
//controller for creating order
export const createOrderController = async (req, res) => {
  try {
    const { userId } = req.body;

    // Fetch the user cart
    const cart = await Cart.findOne({ userId }).populate("products.productId");
    if (!cart || cart.products.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Calculate total amount
    let totalAmount = 0;
    cart.products.forEach((item) => {
      totalAmount += item.productId.price * item.quantity;
    });
    // Unique Transaction ID
    const merchantTransactionId = "TXN" + Date.now();

    // Request Payload
    const requestPayload = {
      merchantId: process.env.PHONEPE_MERCHANT_ID,
      merchantTransactionId,
      merchantUserId: "MUID123",
      amount: totalAmount * 100, // Amount in paise (100 INR)
      redirectUrl: "https://pay.domain.com/payment-success",
      redirectMode: "REDIRECT",
      callbackUrl: "https://pay.domain.com/payment-callback",
      paymentInstrument: { type: "PAY_PAGE" },
    };

    // Convert payload to Base64
    const base64Payload = Buffer.from(JSON.stringify(requestPayload)).toString(
      "base64"
    );

    // Compute X-VERIFY Checksum
    const checksumString =
      base64Payload + "/pg/v1/pay" + process.env.PHONEPE_SALT_KEY;
    const checksum = crypto
      .createHash("sha256")
      .update(checksumString)
      .digest("hex");
    const xVerify = `${checksum}###${process.env.PHONEPE_SALT_INDEX}`;

    // Make API Request
    const response = await axios.post(
      `${process.env.PHONEPE_BASE_URL}/pg/v1/pay`,
      { request: base64Payload },
      {
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": xVerify,
        },
      }
    );

    // Handle Response
    if (response?.data?.success) {
      // Save order in DB
      const newOrder = new Order({
        userId,
        products: cart?.products,
        totalAmount,
        phonepeTransactionId: merchantTransactionId,
        paymentStatus: "Pending",
      });

      await newOrder.save();

      res.status(201).json({
        success: true,
        message: "Order created successfully",
        paymentUrl: response?.data?.data?.instrumentResponse?.redirectInfo?.url,
      });
    } else {
      res
        .status(400)
        .json({ success: false, message: "PhonePe payment failed" });
    }
  } catch (error) {
    console.error("Payment Error:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

//controller for verifying payment

export const verifyPaymentController = async (req, res) => {
  try {
    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({ message: "Missing transaction ID" });
    }

    const order = await Order.findOne({ phonepeTransactionId: transactionId });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const statusPayload = `/pg/v1/status/${process.env.PHONEPE_MERCHANT_ID}/${transactionId}`;
    const checksum = crypto
      .createHash("sha256")
      .update(statusPayload + process.env.PHONEPE_SALT_KEY)
      .digest("hex");

    const xVerify = `${checksum}###${process.env.PHONEPE_SALT_INDEX}`;

    const response = await axios.get(
      `${process.env.PHONEPE_BASE_URL}${statusPayload}`,
      {
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": xVerify,
          "X-MERCHANT-ID": process.env.PHONEPE_MERCHANT_ID,
        },
      }
    );

    // Fix: Check for "state" instead of "status"
    const paymentState = response?.data?.data?.state;
    const responseCode = response?.data?.data?.responseCode;

    if (
      response?.data?.success &&
      paymentState === "COMPLETED" &&
      responseCode === "SUCCESS"
    ) {
      order.paymentStatus = "Paid";
      await order.save();

      // Clear the user's cart after successful payment
      await Cart.findOneAndDelete({ userId: order.userId });

      return res.status(200).json({
        success: true,
        message: "Payment verified successfully",
        order,
      });
    } else {
      order.paymentStatus = "Failed";
      await order.save();

      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
        phonepeResponse: response.data, // Debugging
      });
    }
  } catch (error) {
    console.error("Payment Verification Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Error verifying payment",
      error: error.message,
    });
  }
};

