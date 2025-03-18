import Cart from "../models/cartModel.js";
import Order from "../models/orderModel.js";
import axios from "axios";
import crypto from "crypto";
import userModel from "../models/userModel.js";
import cartModel from "../models/cartModel.js";
import { sendOrderStatusEmail } from "../controllers/emailController.js";

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
    const {
      email,
      firstName,
      lastName,
      phone,
      address,
      cartProducts,
      totalPrice,
      note,
      paymentMethod,
      activeCoupon,
      discountDetails,
      selectedShippingOption,
    } = req.body.orderData;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check if the user exists
    const user = await userModel.findOne({ email });
    let userId = user ? user._id : null;
    let backendCartMap = new Map();

    // If user is logged in, fetch backend cart for validation
    if (user) {
      const backendCart = await cartModel
        .findOne({ email })
        .populate("products.productId");

      if (backendCart && backendCart.products.length > 0) {
        backendCart.products.forEach((item) => {
          backendCartMap.set(item.productId._id.toString(), {
            quantity: item.quantity,
            price: item.productId.price, // Original product price before discounts
          });
        });
      }
    }

    // Cart validation
    let calculatedTotal = 0;
    let discountAmount = 0;
    let isGuestOrder = !user;

    for (let item of cartProducts) {
      const productId = item._id;
      const quantity = item.quantity;
      let price = item.offerPrice || item.finalPrice;
      // Validate backend cart (if logged in)
      if (!isGuestOrder) {
        if (!backendCartMap.has(productId)) {
          return res.status(400).json({ message: "Cart mismatch detected" });
        }
        if (backendCartMap.get(productId).quantity !== quantity) {
          return res
            .status(400)
            .json({ message: "Cart quantity mismatch detected" });
        }
        if (backendCartMap.get(productId).price !== item.price) {
          return res.status(400).json({ message: "Price mismatch detected" });
        }
      }

      // Accumulate total price before discount
      calculatedTotal += price * quantity;
    }

    // Apply coupon discount
    if (activeCoupon) {
      if (activeCoupon.discountType === "flat") {
        discountAmount = activeCoupon.discountValue;
      } else if (activeCoupon.discountType === "percentage") {
        discountAmount = (calculatedTotal * activeCoupon.discountValue) / 100;
        discountAmount = Math.min(
          discountAmount,
          activeCoupon.maxDiscount || discountAmount
        );
      }
    }
    // Calculate final price
    let finalTotalPrice = Math.max(calculatedTotal - discountAmount, 0);
    if (selectedShippingOption) {
      finalTotalPrice += selectedShippingOption.charges;
    }
    if (
      parseFloat(finalTotalPrice).toFixed(2) !==
      parseFloat(totalPrice).toFixed(2)
    ) {
      return res.status(400).json({ message: "Total price mismatch detected" });
    }

    // Create order object
    const newOrder = new Order({
      userId,
      email,
      firstName,
      lastName,
      phone,
      address,
      cartProducts,
      totalPrice: finalTotalPrice,
      discountAmount,
      note,
      paymentMethod,
      isGuestOrder,
    });

    // If COD, save order and return success
    if (paymentMethod === "COD") {
      newOrder.paymentStatus = "Pending";
      await newOrder.save();
      await cartModel.deleteOne({ email });
      return res
        .status(201)
        .json({ success: true, message: "Order placed successfully" });
    } else if (paymentMethod === "PhonePe") {
      // Process PhonePe Payment
      const merchantTransactionId = "TXN" + Date.now();
      const requestPayload = {
        merchantId: process.env.PHONEPE_MERCHANT_ID,
        merchantTransactionId,
        merchantUserId: email,
        amount: finalTotalPrice * 100, // Convert to paise
        redirectUrl: `${process.env.FRONTEND_URL}/order-success`,
        redirectMode: "REDIRECT",
        callbackUrl: `${process.env.BACKEND_URL}/api/v1/order/verify-payment`,
        paymentInstrument: { type: "PAY_PAGE" },
      };

      // Convert payload to Base64
      const base64Payload = Buffer.from(
        JSON.stringify(requestPayload)
      ).toString("base64");

      // Compute X-VERIFY
      const checksumString =
        base64Payload + "/pg/v1/pay" + process.env.PHONEPE_SALT_KEY;
      const xVerify =
        crypto.createHash("sha256").update(checksumString).digest("hex") +
        "###" +
        process.env.PHONEPE_SALT_INDEX;

      // Send request to PhonePe API
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

      if (response?.data?.success) {
        newOrder.phonepeTransactionId = merchantTransactionId;
        newOrder.paymentStatus = "Pending";
        await newOrder.save();
        await cartModel.deleteOne({ email });

        return res.status(201).json({
          success: true,
          message: "Order created successfully, redirecting to payment.",
          paymentUrl: response.data.data.instrumentResponse.redirectInfo.url,
        });
      } else {
        return res
          .status(400)
          .json({ success: false, message: "PhonePe payment failed" });
      }
    } else {
      return res.status(500).json({ error: "Internal Server Error" });
    }
  } catch (error) {
    console.error("Checkout Error:", error.message);
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

// ✅ Update Order Status API
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, newStatus } = req.body;

    // Validate newStatus
    const validStatuses = [
      "Pending",
      "Processing",
      "Shipped",
      "Delivered",
      "Completed",
      "Cancelled",
    ];
    if (!validStatuses.includes(newStatus)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid order status!" });
    }

    // Find the order
    const order = await Order.findById(orderId);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found!" });
    }

    // Update order status and push to statusHistory
    order.orderStatus = newStatus;
    order.statusHistory.push({ status: newStatus, updatedAt: new Date() });

    await order.save();
    // Send email notification
    sendOrderStatusEmail(order.email, orderId, newStatus);

    res
      .status(200)
      .json({ success: true, message: "Order status updated!", order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
