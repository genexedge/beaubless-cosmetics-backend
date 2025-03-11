import Cart from "../models/cartModel.js";
import Order from "../models/orderModel.js";
import axios from "axios";
import crypto from "crypto";
import userModel from "../models/userModel.js";
import cartModel from "../models/cartModel.js";
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
      email: email,
      firstName: firstName,
      lastName: lastName,
      phone: phone,
      address: address,
      cartProducts: cartProducts,
      totalPrice: totalPrice,
      note: note,
      paymentMethod: paymentMethod,
    } = req.body.orderData;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check if the user exists
    const user = await userModel.findOne({ email });
    let userId = null;
    let backendCart = null;
    let backendCartMap = new Map();
    // If user is logged in, fetch backend cart
    if (user) {
      userId = user._id
      backendCart = await cartModel
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
    let isGuestOrder = !user;
    for (let item of cartProducts) {
      const productId = item.id; // Updated key from payload
      const quantity = item.quantity;
      let price = item.price; // Base price

      // Apply discount if available
      if (item.discount && item.discount.percentage) {
        const discountAmount = (item.price * item.discount.percentage) / 100;
        price -= discountAmount; // Adjust price after discount
      }

      if (!isGuestOrder) {
        // If user is logged in, verify cart from backend
        if (!backendCartMap.has(productId)) {
          return res.status(400).json({ message: "Cart mismatch detected" });
        }

        // Validate quantity
        if (backendCartMap.get(productId).quantity !== quantity) {
          return res
            .status(400)
            .json({ message: "Cart quantity mismatch detected" });
        }

        // Validate price (post-discount)
        const backendPrice = backendCartMap.get(productId).price;
        if (backendPrice !== item.price) {
          return res.status(400).json({ message: "Price mismatch detected" });
        }
      }

      // Calculate total price for both guest and logged-in users
      calculatedTotal += price * quantity;
    }
    // Final price validation
    // if (calculatedTotal !== totalPrice) {
    //   return res.status(400).json({ message: "Total price mismatch detected" });
    // }
    // Create order
    const newOrder = new Order({
      userId,
      email,
      firstName,
      lastName,
      phone,
      address,
      cartProducts, // Keep full details for processing
      totalPrice: calculatedTotal, // Use validated total price
      note,
      paymentMethod,
      userId: user ? user._id : null,
      isGuestOrder, // Flag to differentiate orders
    });
    // COD Payment - Direct Order Placement
    if (paymentMethod === "COD") {
      newOrder.paymentStatus = "Pending";
      await newOrder.save();
      await Cart.deleteOne({ email });
      return res
        .status(201)
        .json({ success: true, message: "Order placed successfully" });
    } else {
      // Online Payment - Proceed with PhonePe
      const merchantTransactionId = "TXN" + Date.now();
      const requestPayload = {
        merchantId: process.env.PHONEPE_MERCHANT_ID,
        merchantTransactionId,
        merchantUserId: email,
        amount: totalPrice * 100, // Amount in paise
        redirectUrl: "https://pay.domain.com/payment-success",
        redirectMode: "REDIRECT",
        callbackUrl: "https://pay.domain.com/payment-callback",
        paymentInstrument: { type: "PAY_PAGE" },
      };

      // Convert payload to Base64
      const base64Payload = Buffer.from(
        JSON.stringify(requestPayload)
      ).toString("base64");

      // Compute X-VERIFY Checksum
      const checksumString =
        base64Payload + "/pg/v1/pay" + process.env.PHONEPE_SALT_KEY;
      const checksum = crypto
        .createHash("sha256")
        .update(checksumString)
        .digest("hex");
        const statusPayload = `/pg/v1/status/${process.env.PHONEPE_MERCHANT_ID}/${transactionId}`;

      // Make API Request to PhonePe
      const response = await axios.post(
        ${process.env.PHONEPE_BASE_URL}/pg/v1/pay,
        { request: base64Payload },
        {
          headers: {
            "Content-Type": "application/json",
            "X-VERIFY": xVerify,
          },
        }
      );
    }
    if (response?.data?.success) {
      // Save order in DB (Mark it as "Payment Pending")
      const newOrder = new Order({
        userId,
        email,
        firstName,
        lastName,
        phone,
        address,
        products: cart.products,
        totalAmount: totalPrice,
        note,
        paymentMethod,
        phonepeTransactionId: merchantTransactionId,
        paymentStatus: "Pending", // Will be updated upon payment success
      });

      await newOrder.save();
      await Cart.deleteOne({ email });

      return res.status(201).json({
        success: true,
        message: "Order created successfully, redirecting to payment.",
        paymentUrl: response?.data?.data?.instrumentResponse?.redirectInfo?.url,
      });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "PhonePe payment failed" });
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