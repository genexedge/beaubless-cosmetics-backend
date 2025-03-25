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
    if (!totalPrice) {
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
    
    if (isVariantProduct && Array.isArray(product.variants) && product.variants.length > 0) {
      // Ensure activeSize exists before using `toString()`
      const activeSize = item.activeSize ? item.activeSize.toString() : null;

      // Find the selected variant safely
      const selectedVariant = product.variants.find(
        (variant) => variant._id && activeSize && variant._id.toString() === activeSize
      );

      price = selectedVariant
        ? selectedVariant.offerPrice ?? selectedVariant.finalPrice ?? selectedVariant.price ?? 0
        : product.offerPrice ?? product.finalPrice ?? product.price ?? 0;
    } else {
      // If it's a single product (not a variant)
      price = product.offerPrice ?? product.finalPrice ?? product.price ?? 0;
    }

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
          return res.status(400).json({ message: "Cart quantity mismatch detected" });
        }
        if (backendCartMap.get(productId).price !== price) {
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
      activeCoupon,
      discountDetails,
      selectedShippingOption,
      isGuestOrder: isGuestOrder || false,
      orderStatus: "Pending",
      statusHistory: [{ status: "Pending", updatedAt: new Date() }],
    });
    await newOrder.save();
    if (paymentMethod === "COD") {
      newOrder.paymentStatus = "Pending";
      newOrder.orderId = "";
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
          paymentUrl: paymentResponse.paymentUrl,
        });
      } else {
        return res.status(400).json(paymentResponse);
      }
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

    // Validate newStatus
    const validStatuses = ["Pending", "Processing", "Shipped", "Delivered", "Completed", "Cancelled"];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ success: false, message: "Invalid order status!" });
    }

    // Find the order
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found!" });
    }

    // Update order status and push to statusHistory
    order.orderStatus = newStatus;
    order.statusHistory.push({ status: newStatus, updatedAt: new Date() });

    await order.save();
     // Send email notification
     sendOrderStatusEmail(order.email, orderId, newStatus);

    res.status(200).json({ success: true, message: "Order status updated!", order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// export const cancelOrder = async (req, res) => {
//   try {
//     const orderId = req.params.orderId;
//     console.log(`Cancelling order with ID: ${orderId}`);

//     // Find the order in the database
//     const order = await Order.findById(orderId);
//     if (!order) {
//       return res.status(404).json({ message: "Order not found" });
//     }

//     // Check if the order is already cancelled
//     if (order.orderStatus === "Cancelled") {
//       return res.status(400).json({ message: "Order is already cancelled" });
//     }

//     // Update only the orderStatus field without triggering full validation
//     order.orderStatus = "Cancelled";
//     await order.save({ validateBeforeSave: false }); // ✅ Disable validation

//     res.json({ message: "Order cancelled successfully", order });
//   } catch (error) {
//     console.error("Error cancelling order:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };


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
      await order.save({ validateBeforeSave: false });  // ✅ Disable validation

      res.json({ message: "Order cancelled successfully", order });
  } catch (error) {
      console.error("Error cancelling order:", error);
      res.status(500).json({ message: "Internal server error" });
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


// ------------------------------------

// import Cart from "../models/cartModel.js";
// import Order from "../models/orderModel.js";
// import axios from "axios";
// import crypto from "crypto";
// import userModel from "../models/userModel.js";
// import cartModel from "../models/cartModel.js";
// import { sendOrderStatusEmail } from "../controllers/emailController.js";
// import {
//   StandardCheckoutClient,
//   StandardCheckoutPayRequest,
//   Env,
// } from "pg-sdk-node";

// export const getAllOrder = async (req, res) => {
//   try {
//     const orders = await Order.find(); // Renamed variable to avoid conflict
//     res.status(200).json(orders);
//   } catch (error) {
//     res.status(500).json({ message: "Failed to fetch orders", error });
//   }
// };

// export const getOrderById = async (req, res) => {
//   try {
//     const { orderId } = req.params;
//     console.log("Fetching order ID:", orderId);

//     // Fetching order from MongoDB
//     const order = await Order.findById(orderId);

//     if (!order) {
//       return res.status(404).json({ message: "Order not found" });
//     }

//     res.status(200).json(order);
//   } catch (error) {
//     console.error("Error fetching order:", error.message);
//     res
//       .status(500)
//       .json({ message: "Failed to fetch order details", error: error.message });
//   }
// };

// //controller for creating order
// //controller for creating order

// const clientId = "SU2503141233473872083112";
// const clientSecret = "b9d56a4b-23e1-4b91-a7a2-cdab25111fc5";
// const clientVersion = 1;
// const env = Env.PRODUCTION;
// const client = StandardCheckoutClient.getInstance(
//   clientId,
//   clientSecret,
//   clientVersion,
//   env
// );

// const initiatePhonePePayment = async (finalTotalPrice, email) => {
//   console.log(finalTotalPrice);
//   console.log(email);
//   try {
//     const merchantOrderId = "TXN" + Date.now();
//     const redirectUrl = `${process.env.FRONTEND_URL}/order-success`;

//     const request = StandardCheckoutPayRequest.builder()
//       .merchantOrderId(merchantOrderId)
//       .amount(finalTotalPrice * 100) // Convert amount to paise
//       .redirectUrl(redirectUrl)
//       .build();

//     const response = await client.pay(request);
//     console.log(response);

//     return {
//       success: true,
//       paymentUrl: response.redirectUrl,
//       merchantTransactionId: merchantOrderId,
//     };
//   } catch (error) {
//     console.error("PhonePe Payment Error:", error);
//     return { success: false, message: "Payment initiation failed" };
//   }
// };

// export const createOrderController = async (req, res) => {
//   try {
//     const {
//       email,
//       firstName,
//       lastName,
//       phone,
//       address,
//       cartProducts,
//       totalPrice,
//       note,
//       paymentMethod,
//       activeCoupon,
//       discountDetails,
//       selectedShippingOption,
//     } = req.body.orderData;

//     // Validate required fields
//     if (!email) {
//       return res.status(400).json({ message: "Email is required." });
//     }
//     if (!firstName) {
//       return res.status(400).json({ message: "First name is required." });
//     }
//     if (!lastName) {
//       return res.status(400).json({ message: "Last name is required." });
//     }
//     if (!phone) {
//       return res.status(400).json({ message: "Phone number is required." });
//     }
//     if (!address) {
//       return res.status(400).json({ message: "Address is required." });
//     }
//     if (!cartProducts || cartProducts.length === 0) {
//       return res.status(400).json({ message: "Cart cannot be empty." });
//     }
//     if (!totalPrice) {
//       return res.status(400).json({ message: "Total price is required." });
//     }
//     if (!paymentMethod) {
//       return res.status(400).json({ message: "Payment method is required." });
//     }

//     // Check if the user exists
//     const user = await userModel.findOne({ email });
//     let userId = user ? user._id : null;
//     let backendCartMap = new Map();

//     // If user is logged in, fetch backend cart for validation
//     if (user) {
//       const backendCart = await cartModel
//         .findOne({ userId })
//         .populate("products.productId");
//       if (backendCart && backendCart.products.length > 0) {
//   backendCart.products.forEach((item) => {
//     const product = item.productId;
//     if (!product) return; // Prevent error if product is missing

//     const isVariantProduct = product.productType === "variant";
//     let price;
    
//     if (isVariantProduct && Array.isArray(product.variants) && product.variants.length > 0) {
//       // Ensure activeSize exists before using `toString()`
//       const activeSize = item.activeSize ? item.activeSize.toString() : null;

//       // Find the selected variant safely
//       const selectedVariant = product.variants.find(
//         (variant) => variant._id && activeSize && variant._id.toString() === activeSize
//       );

//       price = selectedVariant
//         ? selectedVariant.offerPrice ?? selectedVariant.finalPrice ?? selectedVariant.price ?? 0
//         : product.offerPrice ?? product.finalPrice ?? product.price ?? 0;
//     } else {
//       // If it's a single product (not a variant)
//       price = product.offerPrice ?? product.finalPrice ?? product.price ?? 0;
//     }

//     // Store the computed price and quantity in the backendCartMap
//     backendCartMap.set(product._id?.toString() || "", {
//       quantity: item.quantity,
//       price: price,
//     });
//   });
// }

//     }

//     // Cart validation
//     let calculatedTotal = 0;
//     let discountAmount = 0;
//     let isGuestOrder = !user;

//     for (let item of cartProducts) {
//       const productId = item._id;
//       const quantity = item.quantity;
//       const isVariantProduct = item.productType === "variant";
//       let price;
//       if (isVariantProduct && item.variants?.length > 0) {
//         // Find the selected variant based on activeSize
//         const selectedVariant = item.variants.find(
//           (variant) => variant.variantId.toString() === item.activeSize?.toString()
//         );

//         price = selectedVariant
//           ? selectedVariant.offerPrice ||
//             selectedVariant.finalPrice ||
//             selectedVariant.price ||
//             0
//           : item.offerPrice || item.finalPrice || item.price || 0;
//       } else {
//         // If it's a single product (not a variant)
//         price = item.offerPrice || item.finalPrice || item.price || 0;
//       }

//       // Validate backend cart (if logged in)
//       if (!isGuestOrder) {
//         if (!backendCartMap.has(productId)) {
//           return res.status(400).json({ message: "Cart mismatch detected" });
//         }
//         if (backendCartMap.get(productId).quantity !== quantity) {
//           return res
//             .status(400)
//             .json({ message: "Cart quantity mismatch detected" });
//         }
//         if (backendCartMap.get(productId).price !== price) {
//           return res.status(400).json({ message: "Price mismatch detected" });
//         }
//       }

//       // Accumulate total price before discount
//       calculatedTotal += price * quantity;
//     }

//     // Apply coupon discount
//     if (
//       activeCoupon &&
//       activeCoupon.discountType &&
//       activeCoupon.discountValue
//     ) {
//       if (activeCoupon.discountType === "flat") {
//         discountAmount = activeCoupon.discountValue;
//       } else if (activeCoupon.discountType === "percentage") {
//         discountAmount = (calculatedTotal * activeCoupon.discountValue) / 100;
//         discountAmount = Math.min(
//           discountAmount,
//           activeCoupon.maxDiscount || discountAmount
//         );
//       }
//     }

//     // Calculate final price
//     let finalTotalPrice = Math.max(calculatedTotal - discountAmount, 0);
//     if (selectedShippingOption) {
//       finalTotalPrice += selectedShippingOption.charges;
//     }

//     // if (parseFloat(finalTotalPrice).toFixed(2) !== parseFloat(totalPrice).toFixed(2)) {
//     //   return res.status(400).json({ message: "Total price mismatch detected" });
//     // }
//     console.log("called here.......................");

//     // Create order object
//     const newOrder = new Order({
//       userId,
//       email,
//       firstName,
//       lastName,
//       phone,
//       address,
//       cartProducts,
//       totalPrice: finalTotalPrice,
//       discountAmount,
//       note,
//       paymentMethod,
//       activeCoupon,
//       discountDetails,
//       selectedShippingOption,
//       isGuestOrder: isGuestOrder || false,
//       orderStatus: "Pending",
//       statusHistory: [{ status: "Pending", updatedAt: new Date() }],
//     });
//     await newOrder.save();
//     if (paymentMethod === "COD") {
//       newOrder.paymentStatus = "Pending";
//       await newOrder.save();
//       if (userId) {
//         await cartModel.deleteOne({ userId });
//       }
//       return res
//         .status(201)
//         .json({ success: true, message: "Order placed successfully" });
//     } else if (paymentMethod === "PhonePe") {
//       // Call the function to initiate PhonePe payment
//       const paymentResponse = await initiatePhonePePayment(totalPrice, email);

//       if (paymentResponse.success) {
//         newOrder.phonepeTransactionId = paymentResponse.merchantTransactionId;
//         newOrder.paymentStatus = "Pending";
//         await newOrder.save();
//         await cartModel.deleteOne({ email });

//         return res.status(201).json({
//           success: true,
//           message: "Order created successfully, redirecting to payment.",
//           paymentUrl: paymentResponse.paymentUrl,
//         });
//       } else {
//         return res.status(400).json(paymentResponse);
//       }
//     }
//   } catch (error) {
//     console.error("Error placing order:", error);
//     res
//       .status(500)
//       .json({ message: "Failed to place order", error: error.message });
//   }
// };

// //controller for verifying payment

// export const verifyPaymentController = async (req, res) => {
//   try {
//     const { transactionId } = req.body;

//     if (!transactionId) {
//       return res.status(400).json({ message: "Missing transaction ID" });
//     }

//     const order = await Order.findOne({ phonepeTransactionId: transactionId });
//     if (!order) {
//       return res.status(404).json({ message: "Order not found" });
//     }

//     const accessToken =
//       "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJpc3MiOiJpZGVudGl0eU1hbmFnZXIiLCJ2ZXJzaW9uIjoiNC4wIiwidGlkIjoiZmFjYzc1YTUtYTFkZC00MjkwLTg0OWQtNmNlYzEyMzMwNGU4Iiwic2lkIjoiZWE4NmY4MWMtYWEzMi00YTg2LWFmZWYtY2MwYzFmODY5NjUzIiwiaWF0IjoxNzQyMzI5MDczLCJleHAiOjE3NDIzMzI2NzN9.nOHp2T_TcRWxPkcCaaTsY-L_P33vzecPPPH2RkOw4vUsdwbgqDdhf353zitcx51N3KCQ0lz8go4F5mgWpAA4HQ";

//     // Prepare the URL for the PhonePe API
//     const statusUrl = `https://api.phonepe.com/apis/pg/checkout/v2/order/${transactionId}/status?details=false`;

//     // Make a request to the PhonePe API to check payment status
//     const response = await axios.get(statusUrl, {
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `O-Bearer ${accessToken}`,
//       },
//     });

//     const paymentState = response.data?.data?.state;
//     const responseCode = response.data?.data?.responseCode;

//     if (
//       response.data?.success &&
//       paymentState === "COMPLETED" &&
//       responseCode === "SUCCESS"
//     ) {
//       // Update order status to Paid
//       order.paymentStatus = "Paid";
//       await order.save();

//       // Remove the cart
//       await Cart.findOneAndDelete({ userId: order.userId });

//       return res.status(200).json({
//         success: true,
//         message: "Payment verified successfully",
//         order,
//       });
//     } else {
//       order.paymentStatus = "Failed";
//       await order.save();

//       return res.status(400).json({
//         success: false,
//         message: "Payment verification failed",
//         phonepeResponse: response.data, // Debugging response data
//       });
//     }
//   } catch (error) {
//     console.error("Payment Verification Error:", error.message);
//     return res.status(500).json({
//       success: false,
//       message: "Error verifying payment",
//       error: error.message,
//     });
//   }
// };

// // ✅ Update Order Status API
// export const updateOrderStatus = async (req, res) => {
//   try {
//     const { orderId, newStatus } = req.body;

//     // Validate newStatus
//     const validStatuses = [
//       "Pending",
//       "Processing",
//       "Shipped",
//       "Delivered",
//       "Completed",
//       "Cancelled",
//     ];
//     if (!validStatuses.includes(newStatus)) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Invalid order status!" });
//     }

//     // Find the order
//     const order = await Order.findById(orderId);

//     if (!order) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Order not found!" });
//     }

//     // Update order status and push to statusHistory
//     order.orderStatus = newStatus;
//     order.statusHistory.push({ status: newStatus, updatedAt: new Date() });

//     await order.save();
//     // Send email notification
//     sendOrderStatusEmail(order.email, orderId, newStatus);

//     res
//       .status(200)
//       .json({ success: true, message: "Order status updated!", order });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// export const cancelOrder = async (req, res) => {
//   try {
//     const orderId = req.params.orderId;
//     console.log(`Cancelling order with ID: ${orderId}`);

//     // Find the order in the database
//     const order = await Order.findById(orderId);
//     if (!order) {
//       return res.status(404).json({ message: "Order not found" });
//     }

//     // Check if the order is already cancelled
//     if (order.orderStatus === "Cancelled") {
//       return res.status(400).json({ message: "Order is already cancelled" });
//     }

//     // Update only the orderStatus field without triggering full validation
//     order.orderStatus = "Cancelled";
//     await order.save({ validateBeforeSave: false }); // ✅ Disable validation

//     res.json({ message: "Order cancelled successfully", order });
//   } catch (error) {
//     console.error("Error cancelling order:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };
