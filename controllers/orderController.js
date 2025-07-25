import Cart from "../models/cartModel.js";
import Order from "../models/orderModel.js";
import axios from "axios";
import crypto from "crypto";
import Product from "../models/productModel.js";
import userModel from "../models/userModel.js";
import cartModel from "../models/cartModel.js";
import mongoose from "mongoose";
import { sendOrderStatusEmail,sendOrderPlacedMail,sendOrderPlacedMailAdmin,sendOrderCancelledMail,sendOrderCancelledMailAdmin,sendOrderPendingMail,sendOrderPendingMailAdmin } from "../controllers/emailController.js";
import Razorpay from "razorpay";
import {
  StandardCheckoutClient,
  StandardCheckoutPayRequest,
  Env,
} from "pg-sdk-node";
import { applyCoupon } from "../helpers/applyCoupon.js";

export const getAllOrder = async (req, res) => {
  try {
    const orders = await Order.find(); // Renamed variable to avoid conflict
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch orders", error });
  }
};

export const getAllOrderByUser = async (req, res) => {
  const { userId } = req.params;

  try {

    // console.log(orders)
    const userOrders = await Order.find({ userId }).sort({ createdAt: -1 }); // assuming "user" field stores userId in Order schema
    console.log("userOrders",userOrders)
    if (!userOrders || userOrders.length === 0) {
      return res.status(404).json({ message: "No orders found for this user." });
    }

    res.status(200).json({success:true,userOrders});
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user orders", error });
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
    res
      .status(500)
      .json({ message: "Failed to fetch order details", error: error.message });
  }
};

//controller for creating order
//controller for creating order

const clientId = "SU2503141233473872083112";
const clientSecret = "b9d56a4b-23e1-4b91-a7a2-cdab25111fc5";
const clientVersion = 1;
const env = Env.PRODUCTION;
const client = StandardCheckoutClient.getInstance(
  clientId,
  clientSecret,
  clientVersion,
  env
);

const initiatePhonePePayment = async (finalTotalPrice, email) => {
  try {
    const merchantOrderId = "TXN" + Date.now();
    const redirectUrl = `${process.env.FRONTEND_URL}/order-success`;

    const request = StandardCheckoutPayRequest.builder()
      .merchantOrderId(merchantOrderId)
      .amount(finalTotalPrice * 100) // Convert amount to paise
      .redirectUrl(redirectUrl)
      .build();

    const response = await client.pay(request);
    console.log(response);

    return {
      success: true,
      paymentUrl: response.redirectUrl,
      merchantTransactionId: merchantOrderId,
    };
  } catch (error) {
    console.error("PhonePe Payment Error:", error);
    return { success: false, message: "Payment initiation failed" };
  }
};



const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const initiateRazorpayPayment = async (finalOrderTotal, email) => {
  try {
    const razorpayOrder = await razorpayInstance.orders.create({
      amount: finalOrderTotal * 100, // amount in paise
      currency: "INR",
      receipt: "receipt_" + Date.now(),

      payment_capture: 1, // auto-capture
      notes: {
        email,
      },
    });

    return {
      success: true,
      razorpayOrderId: razorpayOrder.id,
      razorpayOrderDetails: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key: process.env.RAZORPAY_KEY_ID, // required by frontend to complete payment
      },
    };
  } catch (error) {
    console.error("Razorpay Payment Error:", error);
    return { success: false, message: "Razorpay payment initiation failed" };
  }
};


const merchant_id = '4240148';
const access_code = 'AVHM65MD34AU69MHUA';
const working_key = '947D86B6EE2E87282AF34AF74C60E5B3';

const initiateCcAvenuePayment = async ({ amount, name, email, phone }) => {
  try {
    const order_id = `ORDER${Date.now()}`;

    const data = {
      merchant_id,
      order_id,
      currency: 'INR',
      amount,
      redirect_url: 'https://www.beaubless.com/order-success',
      cancel_url: 'https://www.beaubless.com/order-failure',
      language: 'EN',
      billing_name: name,
      billing_email: email,
      billing_tel: phone,
      integration_type: 'redirect',
      payment_option: 'OPTCRDC',
    };

    const formBody = Object.entries(data)
      .map(([key, val]) => `${key}=${encodeURIComponent(val)}`)
      .join('&');

    const encrypt = (plainText, workingKey) => {
      const key = crypto.createHash('md5').update(workingKey).digest();
      const iv = Buffer.from([...Array(16).keys()]);
      const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
      let encrypted = cipher.update(plainText, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return encrypted;
    };

    const encRequest = encrypt(formBody, working_key);

    return {
      success: true,
      encRequest,
      access_code,
      order_id,
    };

  } catch (error) {
    console.error("CCAvenue Payment Error:", error);
    return { success: false, message: "CCAvenue payment initiation failed" };
  }
};


export const createOrderController = async (req, res) => {
  try {
    const { email, firstName,  lastName,   phone,     address,      cartProducts, finalOrderTotal, note, paymentMethod, activeCoupon,   discountDetails, selectedShippingOption, } = req.body.orderData;

    // Validate required fields
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }
    if (!firstName) {
      return res.status(400).json({ message: "First name is required." });
    }
    if (!lastName) {
      return res.status(400).json({ message: "Last name is required." });
    }
    if (!phone) {
      return res.status(400).json({ message: "Phone number is required." });
    }
    if (!address) {
      return res.status(400).json({ message: "Address is required." });
    }
    if (!cartProducts || cartProducts.length === 0) {
      return res.status(400).json({ message: "Cart cannot be empty." });
    }
    if (!finalOrderTotal) {
      return res.status(400).json({ message: "Total price is required." });
    }
    if (!paymentMethod) {
      return res.status(400).json({ message: "Payment method is required." });
    }

    // Check if the user exists
    const user = await userModel.findOne({ email });
    let userId = user ? user._id : null;
    let backendCartMap = new Map();
    // If user is logged in, fetch backend cart for validation
    if (user) {
      const backendCart = await cartModel
        .findOne({ userId })
        .populate("products.productId");

      if (backendCart && backendCart.products.length > 0) {
        backendCart.products.forEach((item) => {
          const product = item.productId;
          if (!product) return; // Prevent error if product is missing
          const isVariantProduct = product.productType === "variant";
          let price;

          if (
            isVariantProduct &&
            Array.isArray(product.variants) &&
            product.variants.length > 0
          ) {
            // Ensure activeSize exists before using `toString()`
            const activeSize = item.activeSize
              ? item.activeSize.toString()
              : null;

            // Find the selected variant safely
            const selectedVariant = product.variants.find(
              (variant) =>
                variant._id &&
                activeSize &&
                variant._id.toString() === activeSize
            );
            console.log("selectedVariant",selectedVariant)
            price = selectedVariant
  ? selectedVariant.offerPrice || selectedVariant.offerprice ||
    selectedVariant.finalPrice || selectedVariant.finalprice ||
    selectedVariant.price || selectedVariant.Price || 0
  : product.offerPrice || product.finalPrice || product.price || 0;

              console.log(price,product.offerPrice,product.finalPrice,product.price)
          } else {
            // If it's a single product (not a variant)
            console.log("elsePrice",price)
            price =
              product.offerPrice ?? product.finalPrice ?? product.price ?? 0;
          }
          console.log(price)
          // Store the computed price and quantity in the backendCartMap
          backendCartMap.set(product._id?.toString() || "", {
            quantity: item.quantity,
            price: price,
          });
        });
      }
    }

    // Cart validation
    let calculatedTotal = 0;
    let isGuestOrder = !user;
    for (let item of cartProducts) {
      const productId = item._id;
      const quantity = item.quantity;
      const isVariantProduct = item.productType === "variant";
      let price;
      if (isVariantProduct && item.variants?.length > 0) {
        // Find the selected variant based on activeSize
        const selectedVariant = item.variants.find(
          (variant) =>
            variant.variantId.toString() === item.activeSize?.toString()
        );

        price = selectedVariant
          ? selectedVariant.offerPrice ||
            selectedVariant.finalPrice ||
            selectedVariant.price ||
            0
          : item.offerPrice || item.finalPrice || item.price || 0;
      } else {
        // If it's a single product (not a variant)
        price = item.offerPrice || item.finalPrice || item.price || 0;
      }
      // // Validate backend cart (if logged in)
      // if (!isGuestOrder) {
      //   if (!backendCartMap.has(productId)) {
      //     return res.status(400).json({ message: "Cart mismatch detected" });
      //   }
      //   if (backendCartMap.get(productId).quantity !== quantity) {
      //     return res
      //       .status(400)
      //       .json({ message: "Cart quantity mismatch detected" });
      //   }
      //   console.log(backendCartMap.get(productId) , price)
      //   if (backendCartMap.get(productId).price !== price) {
      //     return res.status(400).json({ message: "Price mismatch detected" });
      //   }
      // }

      // Accumulate total price before discount
      calculatedTotal += price * quantity;
      console.log("calculatedTotal",calculatedTotal);
      
      
    }
    // Apply coupon only if it exists
  let discountAmount = 0;
if (activeCoupon?.code) {
  const result = await applyCoupon(activeCoupon.code, calculatedTotal);
  discountAmount = result.discountAmount || 0;

  if (result.error) {
    return res.status(400).json({ success: false, message: result.error });
  }

  console.log(">> Coupon Applied:");
  console.log("Active Coupon Code:", activeCoupon.code);
  console.log("Calculated Total (Before Discount):", calculatedTotal);
  console.log("Discount Amount Returned:", discountAmount);
} else {
  console.log(">> No coupon applied.");
}
    
    // Calculate final price
    let finalTotalPrice = Math.max(calculatedTotal - discountAmount, 0);
    console.log(">> After Discount:");
    console.log("Final Total after Discount (without shipping):", finalTotalPrice);
    
    if (selectedShippingOption) {
      console.log(">> Shipping Option Selected:");
      console.log("Shipping Charges:", selectedShippingOption?.charges);
      finalTotalPrice += selectedShippingOption.charges;
    }
    
    console.log(">> Final Calculation:");
    console.log("Final Total with Shipping:", finalTotalPrice);
    console.log("Frontend Sent Final Order Total:", finalOrderTotal);
    
    if (
      parseFloat(finalTotalPrice).toFixed(2) !==
      parseFloat(finalOrderTotal).toFixed(2)
    ) {
      console.log("❌ Total price mismatch detected!");
      return res.status(400).json({ message: "Total price mismatch detected" });
    }
    
    console.log("✅ Total price matched. Proceeding with order creation...");
    
    
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
      activeCoupon,
      discountDetails,
      selectedShippingOption,
      isGuestOrder: isGuestOrder || false,
      orderStatus: "Pending",
      statusHistory: [{ status: "Pending", updatedAt: new Date() }],
    });
    await newOrder.save();

    let insufficientStock = null;

for (let item of cartProducts) {
  const product = await Product.findById(item.productId);
  if (!product) continue;

  // If product has variants
  if (product.productType === "variant") {
    const variantIndex = product.variants.findIndex(
      (v) => v._id.toString() === item.activeSize?.toString()
    );

    if (variantIndex === -1) {
      insufficientStock = `Variant not found for ${product.name}`;
      break;
    }

    const variant = product.variants[variantIndex];
    const currentStock = variant.inventory || 0;
    const orderQty = item.quantity || 1;
    const newStock = currentStock - orderQty;

    console.log("🔍 Variant:", variant);
    console.log("🟢 Stock before:", currentStock, "| Order:", orderQty, "| After:", newStock);

    

    // Store new stock temporarily
    product.variants[variantIndex].inventory = newStock;
  } else {
    // Non-variant product
    const currentStock = product.stock || 0;
    const orderQty = item.quantity || 1;
    const newStock = currentStock - orderQty;

    if (newStock < 0) {
      insufficientStock = `Insufficient stock for ${product.name}`;
      break;
    }

    product.stock = newStock;
  }

  // Save after all checks
  await product.save();
}

if (insufficientStock) {
  return res.status(400).json({ message: insufficientStock });
}

console.log("Stock updated successfully");

    
    if (paymentMethod === "COD") {
  newOrder.paymentStatus = "Pending";
  await newOrder.save();

  if (userId) {
    await cartModel.deleteOne({ userId });
  }

  // ✅ Send mail in background (do not await)
  console.log("📧 Sending customer mail...");
  sendOrderPlacedMail(email, {
    orderId: newOrder._id,
    orderStatus: "Confirmed",
    customerName: `${firstName} ${lastName}`,
    orderDate: new Date(newOrder.createdAt).toLocaleString(),
    shippingAddress: { ...address, phone },
    items: cartProducts,
    totalAmount: finalOrderTotal,
    paymentMethod: paymentMethod,
    shippingOption: selectedShippingOption,
    note: note || "",
  }).catch(console.error);

  console.log("📧 Sending admin mail...");
  sendOrderPlacedMailAdmin({
    orderId: newOrder._id,
    orderStatus: "Confirmed",
    customerName: `${firstName} ${lastName}`,
    orderDate: new Date(newOrder.createdAt).toLocaleString(),
    shippingAddress: { ...address, phone },
    items: cartProducts,
    totalAmount: finalOrderTotal,
    paymentMethod: paymentMethod,
    shippingOption: selectedShippingOption,
    note: note || "",
  }).catch(console.error);

  // ✅ Now respond to client
  return res
    .status(201)
    .json({ success: true, message: "Order placed successfully" });
}
else if (paymentMethod === "Razorpay") {
    try {
      // Call the function to initiate Razorpay payment
      const paymentResponse = await initiateRazorpayPayment(finalOrderTotal, email);
  
      if (paymentResponse.success) {
        newOrder.razorpayOrderId = paymentResponse.razorpayOrderDetails.id;
        newOrder.paymentStatus = "Pending";
        await newOrder.save();
        await cartModel.deleteOne({ email });
  
        return res.status(201).json({
          success: true,
          message: "Order created successfully, redirecting to Razorpay payment.",
          paymentUrl: `${process.env.FRONTEND_URL}/razorpay-checkout?order_id=${paymentResponse.razorpayOrderId}&amount=${paymentResponse.razorpayOrderDetails.amount}&currency=${paymentResponse.razorpayOrderDetails.currency}&key=${paymentResponse.razorpayOrderDetails.key}&email=${email}`,
          razorpayOrderDetails: paymentResponse.razorpayOrderDetails,
          orderDetails: newOrder,
        });
        
        
      } else {
        return res.status(400).json({
          success: false,
          message: paymentResponse.message || "Razorpay payment initiation failed.",
        });
      }
    } catch (error) {
      console.error("Razorpay payment error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error during Razorpay payment initiation.",
      });
    }
  } 
    
  } catch (error) {
    console.error("Error placing order:", error);
    res
      .status(500)
      .json({ message: "Failed to place order", error: error.message });
  }
};

//controller for verifying payment

export const verifyPaymentController = async (req, res) => {
  try {
    const { order_id: orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ message: "Missing order ID" });
    }

    const order = await Order.findOne({ razorpayOrderId: orderId });

    if (!order?.razorpayOrderId) {
      return res.status(400).json({ message: "No Razorpay Order ID associated with this order" });
    }

    const response = await axios.get(
      `https://api.razorpay.com/v1/orders/${order.razorpayOrderId}/payments`,
      {
        auth: {
          username: process.env.RAZORPAY_KEY_ID,
          password: process.env.RAZORPAY_KEY_SECRET,
        },
      }
    );

    // Save Razorpay payment logs to the order
    const payments = response.data.items || [];
    let orderStatus = "Pending"; // default

    if (payments.length > 0) {
      const status = payments[0].status;

      if (status === "captured") {
        orderStatus = "Confirmed";
      } else if (["authorized", "created", "pending"].includes(status)) {
        orderStatus = "Pending";
      } else if (["failed", "refunded", "cancelled"].includes(status)) {
        orderStatus = "Cancelled";
      }

      order.orderStatus = orderStatus;

      if (!Array.isArray(order.statusHistory)) {
        order.statusHistory = [];
      }

      order.statusHistory.push({
        status: orderStatus,
        updatedAt: new Date(),
      });
    }

    order.paymentLog = response.data;
    order.paymentStatus = payments[0]?.status || null;

    await order.save();

    const updatedOrder = await Order.findById(order._id);

    // 🔁 Mail content
    const mailData = {
      orderId: updatedOrder._id,
      orderStatus: updatedOrder.orderStatus,
      customerName: `${updatedOrder.firstName} ${updatedOrder.lastName}`,
      orderDate: new Date(order.createdAt).toLocaleString(),
      shippingAddress: { ...updatedOrder.address, phone: updatedOrder.phone },
      items: updatedOrder.cartProducts,
      totalAmount: updatedOrder.totalPrice,
      paymentMethod: updatedOrder.paymentMethod,
      shippingOption: updatedOrder.selectedShippingOption.name,
      note: updatedOrder.note || "",
    };

    // 📨 Send mail in background (non-blocking)
    if (updatedOrder.orderStatus === "Confirmed") {
      sendOrderPlacedMail(updatedOrder.email, mailData).catch(console.error);
      sendOrderPlacedMailAdmin(mailData).catch(console.error);
    } else if (updatedOrder.orderStatus === "Cancelled") {
      sendOrderCancelledMail(updatedOrder.email, mailData).catch(console.error);
    } else if (updatedOrder.orderStatus === "Pending") {
      sendOrderPendingMail(updatedOrder.email, mailData).catch(console.error);
    }

    // ✅ Respond fast
    return res.status(200).json({
      message: "Payment logs fetched and saved successfully",
      orderStatus,
      paymentStatus: payments[0]?.status,
      paymentLogs: order.paymentLog,
    });

  } catch (error) {
    console.error("Error verifying Razorpay payment:", error.response?.data || error.message);
    return res.status(500).json({
      message: "Failed to verify Razorpay payment",
      error: error.response?.data || error.message,
    });
  }
};


export const verifyPaymentControllerPhonepe = async (req, res) => {
  try {
    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({ message: "Missing transaction ID" });
    }

    const order = await Order.findOne({ phonepeTransactionId: transactionId });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const accessToken =
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJpc3MiOiJpZGVudGl0eU1hbmFnZXIiLCJ2ZXJzaW9uIjoiNC4wIiwidGlkIjoiZmFjYzc1YTUtYTFkZC00MjkwLTg0OWQtNmNlYzEyMzMwNGU4Iiwic2lkIjoiZWE4NmY4MWMtYWEzMi00YTg2LWFmZWYtY2MwYzFmODY5NjUzIiwiaWF0IjoxNzQyMzI5MDczLCJleHAiOjE3NDIzMzI2NzN9.nOHp2T_TcRWxPkcCaaTsY-L_P33vzecPPPH2RkOw4vUsdwbgqDdhf353zitcx51N3KCQ0lz8go4F5mgWpAA4HQ";

    // Prepare the URL for the PhonePe API
    const statusUrl = `https://api.phonepe.com/apis/pg/checkout/v2/order/${transactionId}/status?details=false`;

    // Make a request to the PhonePe API to check payment status
    const response = await axios.get(statusUrl, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `O-Bearer ${accessToken}`,
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
        phonepeResponse: response.data, // Debugging response data
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

    const order = await Order.findById(orderId);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found!" });
    }

    // ✅ Avoid duplicate status logging
    const lastStatus = order.statusHistory?.[order.statusHistory.length - 1]?.status;

    if (lastStatus === newStatus) {
      return res.status(200).json({
        success: true,
        message: `Order is already marked as "${newStatus}"`,
        order,
      });
    }

    // ✅ If the previous status was "Cancelled", restore stock
    if (order.orderStatus === "Cancelled") {
      const cartProducts = order.cartProducts;
      let insufficientStock = null;

      for (let item of cartProducts) {
        const product = await Product.findById(item.productId);
        if (!product) continue;

        const orderQty = item.quantity || 1;

        if (product.productType === "variant") {
          const variantIndex = product.variants.findIndex(
            (v) => v._id.toString() === item.activeSize?.toString()
          );

          if (variantIndex === -1) {
            insufficientStock = `Variant not found for ${product.name}`;
            break;
          }

          product.variants[variantIndex].inventory += orderQty;
        } else {
          product.stock += orderQty;
        }

        await product.save();
      }

      if (insufficientStock) {
        return res.status(400).json({ message: insufficientStock });
      }

      console.log("🟢 Inventory regained successfully");
    }

    // ✅ Update orderStatus
    order.orderStatus = newStatus;

    // ✅ Push status to history only if changed
    order.statusHistory.push({
      status: newStatus,
      updatedAt: new Date(),
    });

    await order.save();

    // ✅ Send status update email
    await sendOrderStatusEmail(order.email, {
      email: order.email,
      data: order,
      orderId,
      newStatus,
    });

    res
      .status(200)
      .json({ success: true, message: "Order status updated!", order });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};




export const cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    console.log(`Cancelling order with ID: ${orderId}`);

    // Find the order in the database
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check if the order is already cancelled
    if (order.orderStatus === "Cancelled") {
      return res.status(400).json({ message: "Order is already cancelled" });
    }

    // Update only the orderStatus field without triggering full validation
    order.orderStatus = "Cancelled";
    await order.save({ validateBeforeSave: false }); // ✅ Disable validation

    res.json({ message: "Order cancelled successfully", order });
  } catch (error) {
    console.error("Error cancelling order:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const trackOrderById = async (req, res) => {
  try {
    const { email, orderId } = req.body;

    if (!email || !orderId) {
      return res
        .status(400)
        .json({ success: false, message: "Email and Order ID are required!" });
    }
     // Check if orderId is a valid ObjectId
     if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Order ID format." });
    }


    const order = await Order.findOne({ _id: orderId, email });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found with provided details." });
    }

    const { orderStatus, statusHistory } = order;

    res.status(200).json({
      success: true,
      orderStatus,
      statusHistory,
    });
  } catch (error) {
    console.error("Track Order Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};



export const testOrder = async (req, res) => {
  const { amount, name, email, phone } = req.body;

  const order_id = `ORDER${Date.now()}`;

  const data = {
    merchant_id,
    order_id,
    currency: 'INR',
    amount,
    redirect_url: 'https://www.beaubless.com/order-successs',
    cancel_url: 'https://www.beaubless.com/order-failure',
    language: 'EN',
    billing_name: name,
    billing_email: email,
    billing_tel: phone,
    integration_type: 'redirect',  // required for iframe
    payment_option: 'OPTCRDC',          // 💳 Force credit card selection
  };

  // Convert to URL-encoded query string
  const formBody = Object.entries(data).map(
    ([key, val]) => `${key}=${encodeURIComponent(val)}`
  ).join('&');

  // Encrypt using AES-128-CBC
  const encrypt = (plainText, workingKey) => {
    const key = crypto.createHash('md5').update(workingKey).digest();
    const iv = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  };
  const encRequest = encrypt(formBody, working_key);

  res.json({
    encRequest,
    access_code,
    order_id
  });
};


