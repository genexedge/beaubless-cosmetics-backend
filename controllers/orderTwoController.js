import Cart from "../models/cartModel.js";
import Order from "../models/orderModel.js";
import axios from "axios";
import crypto from "crypto";

const PHONEPE_MERCHANT_ID = "PGTESTPAYUAT77";
const PHONEPE_SALT_KEY = "14fa5465-f8a7-443f-8477-f986b8fcfde9";
const PHONEPE_SALT_INDEX = 1;
const PHONEPE_BASE_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox";

//controller for creating order
export const createOrderTwoController = async (req, res) => {
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
      merchantId: PHONEPE_MERCHANT_ID,
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
    const checksumString = base64Payload + "/pg/v1/pay" + PHONEPE_SALT_KEY;
    const checksum = crypto
      .createHash("sha256")
      .update(checksumString)
      .digest("hex");
    const xVerify = `${checksum}###${PHONEPE_SALT_INDEX}`;

    // Make API Request
    const response = await axios.post(
      `${PHONEPE_BASE_URL}/pg/v1/pay`,
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
