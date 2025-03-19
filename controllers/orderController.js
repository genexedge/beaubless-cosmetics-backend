import Cart from "../models/cartModel.js";
import Order from "../models/orderModel.js";
import axios from "axios";
import crypto from "crypto";
import userModel from "../models/userModel.js";
import cartModel from "../models/cartModel.js";
import { sendOrderStatusEmail } from "../controllers/emailController.js";
import { StandardCheckoutClient, StandardCheckoutPayRequest, Env } from "pg-sdk-node";

export const getAllOrder = async (req, res) => {
  try {
    const orders = await Order.find(); // Renamed variable to avoid conflict
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch orders", error });
  }
};


export const getOrderById = async (req, res) => {
  try {
      const { orderId } = req.params;
      console.log("Fetching order ID:", orderId);

      // Fetching order from MongoDB
      const order = await Order.findById(orderId);
      
      if (!order) {
          return res.status(404).json({ message: "Order not found" });
      }

      res.status(200).json(order);
  } catch (error) {
      console.error("Error fetching order:", error.message);
      res.status(500).json({ message: "Failed to fetch order details", error: error.message });
  }
};

//controller for creating order
//controller for creating order
export const createOrderController = async (req, res) => {
  try {
    console.log("Called");
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
      let price = item.price; // Base price

      // Apply discount if available
      if (item.discount && item.discount.percentage) {
        const discountAmount = (item.price * item.discount.percentage) / 100;
        price -= discountAmount; // Adjust price after discount
      }

      if (!isGuestOrder) {
        if (!backendCartMap.has(productId)) {
          return res.status(400).json({ message: "Cart mismatch detected" });
        }
        if (backendCartMap.get(productId).quantity !== quantity) {
          return res.status(400).json({ message: "Cart quantity mismatch detected" });
        }
        if (backendCartMap.get(productId).price !== item.price) {
          return res.status(400).json({ message: "Price mismatch detected" });
        }
      }

      // Accumulate total price before discount
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
      cartProducts,
      totalPrice,
      discountAmount,
      note,
      paymentMethod,
      isGuestOrder,
    });

    // If COD, save order and return success
    if (paymentMethod === "COD") {
      newOrder.paymentStatus = "Pending";
      newOrder.orderId = 'COD';
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
  `${process.env.PHONEPE_BASE_URL}/pg/v1/pay`, // Correctly wrap in backticks
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
    console.error("Error placing order:", error);
    res.status(500).json({ message: "Failed to place order", error: error.message });
  }
};




//controller for verifying payment

// Generate the access token
import qs from "querystring";

const generateAccessToken = async () => {
  const url = "https://api.phonepe.com/apis/identity-manager/v1/oauth/token";
  const grant_type = "client_credentials";

  const body = qs.stringify({
    clientId: 'SU2503141233473872083112',  // Replace with actual client ID
    clientVersion: 1,                     // Replace with actual client version
    clientSecret: 'b9d56a4b-23e1-4b91-a7a2-cdab25111fc5',  // Replace with actual client secret
    grant_type,
  });

  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  try {
    const response = await axios.post(url, body, { headers });
    if (response.data.access_token) {
      console.log('Access Token:', response.data.access_token);  // Log the access token
      return response.data.access_token;
    } else {
      console.error('Error: No access token in response');
    }
  } catch (error) {
    console.error("Error generating access token:", error.message);
    throw new Error("Error generating access token");
  }
};

// Example usage




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

    const accessToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJpc3MiOiJpZGVudGl0eU1hbmFnZXIiLCJ2ZXJzaW9uIjoiNC4wIiwidGlkIjoiZmFjYzc1YTUtYTFkZC00MjkwLTg0OWQtNmNlYzEyMzMwNGU4Iiwic2lkIjoiZWE4NmY4MWMtYWEzMi00YTg2LWFmZWYtY2MwYzFmODY5NjUzIiwiaWF0IjoxNzQyMzI5MDczLCJleHAiOjE3NDIzMzI2NzN9.nOHp2T_TcRWxPkcCaaTsY-L_P33vzecPPPH2RkOw4vUsdwbgqDdhf353zitcx51N3KCQ0lz8go4F5mgWpAA4HQ";
    
    // Prepare the URL for the PhonePe API
    const statusUrl = `https://api.phonepe.com/apis/pg/checkout/v2/order/${transactionId}/status?details=false`;

    // Make a request to the PhonePe API to check payment status
    const response = await axios.get(statusUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `O-Bearer ${accessToken}`,
      },
    });

    const paymentState = response.data?.data?.state;
    const responseCode = response.data?.data?.responseCode;

    if (
      response.data?.success &&
      paymentState === "COMPLETED" &&
      responseCode === "SUCCESS"
    ) {
      // Update order status to Paid
      order.paymentStatus = "Paid";
      await order.save();

      // Remove the cart
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
        phonepeResponse: response.data,  // Debugging response data
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
export const cancelOrder = async (req, res) => {
  try {
    const { orderId, newStatus } = req.body;

    if (!orderId || !newStatus) {
      return res.status(400).json({
        success: false,
        message: "Order ID and new status are required!",
      });
    }

    // Allowed order statuses
    const validStatuses = [
      "Pending",
      "Processing",
      "Shipped",
      "Delivered",
      "Completed",
      "Cancelled",
    ];

    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status provided!",
      });
    }

    // Find the order
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found!",
      });
    }

    // Prevent cancellation of completed or already cancelled orders
    if (["Completed", "Delivered", "Cancelled"].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be updated to ${newStatus} as it is already marked as '${order.orderStatus}'.`,
      });
    }

    // Update order status and push to status history
    order.orderStatus = newStatus;
    order.statusHistory.push({ status: newStatus, updatedAt: new Date() });

    await order.save();

    // Send email notification (Ensure this function exists)
    sendOrderStatusEmail(order.email, orderId, newStatus);

    return res.status(200).json({
      success: true,
      message: `Order status updated to '${newStatus}' successfully!`,
      order,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
      error: error.message,
    });
  }
};
