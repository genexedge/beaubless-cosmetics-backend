// 📦 Required dependencies
import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import ejs from "ejs";
import { fileURLToPath } from "url";

// Setup __dirname for ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Constants
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const FROM_EMAIL = process.env.ZOHO_EMAIL;
const FROM_NAME = process.env.BRAND_NAME || "Your Brand";
const ADMIN_EMAIL = 'orders@beaubless.com';

async function sendEmail({ toEmail, subject, htmlContent, name = "Customer" }) {
  try {
    const payload = {
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: toEmail, name }],
      subject,
      htmlContent
    };

    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      payload,
      {
        headers: {
          "api-key": BREVO_API_KEY,
          "Content-Type": "application/json",
          Accept: "application/json"
        }
      }
    );

    console.log("📧 Email sent:", response.data.messageId || "Success");
  } catch (error) {
    console.error("❌ Email error:", error.response?.data || error.message);
  }
}

// Utility function
function renderTemplate(templateFile, data) {
  const templatePath = path.join(__dirname, `../views/email/${templateFile}`);
  const template = fs.readFileSync(templatePath, "utf-8");
  return ejs.render(template, data);
}

// Email Senders
export const sendOrderPlacedMail = async (toEmail, orderData) => {
  const html = renderTemplate("orderPlaced.ejs", { order: orderData });
  await sendEmail({ toEmail, subject: "🛍️ Your Order Has Been Placed!", htmlContent: html, name: orderData.customerName });
};

export const sendOrderPlacedMailAdmin = async (orderData) => {
  const html = renderTemplate("orderPlacedinternal.ejs", { order: orderData });
  await sendEmail({ toEmail: ADMIN_EMAIL, subject: "🛍️ New Order Received!", htmlContent: html });
};

export const sendOrderPendingMail = async (toEmail, orderData) => {
  const html = renderTemplate("orderPending.ejs", { order: orderData });
  await sendEmail({ toEmail, subject: "🛍️ Your Order is currently Pending.", htmlContent: html, name: orderData.customerName });
};

export const sendOrderPendingMailAdmin = async (orderData) => {
  const html = renderTemplate("orderPendingInternal.ejs", { order: orderData });
  await sendEmail({ toEmail: ADMIN_EMAIL, subject: "🛍️ Order is currently Pending.!", htmlContent: html });
};

export const sendOrderCancelledMail = async (toEmail, orderData) => {
  const html = renderTemplate("orderCancelled.ejs", { order: orderData });
  await sendEmail({ toEmail, subject: "🛍️ Your Order Has Been Cancelled!", htmlContent: html, name: orderData.customerName });
};

export const sendOrderCancelledMailAdmin = async (orderData) => {
  const html = renderTemplate("orderCancelledInternal.ejs", { order: orderData });
  await sendEmail({ toEmail: ADMIN_EMAIL, subject: "🛍️ Order Has Been Cancelled!", htmlContent: html });
};

export const sendOrderStatusEmail = async (toEmail, data) => {
  const { orderId, newStatus, data: order } = data;
  const html = renderTemplate("orderStatus.ejs", { orderId, newStatus, data: order });
  await sendEmail({ toEmail, subject: `📦 Order #${orderId} - Status Update`, htmlContent: html });
};

export const sendRegistrationEmail = async (toEmail, userData) => {
  const html = renderTemplate("registration.ejs", {
    user: userData,
    brand: process.env.BRAND_NAME || "Your Company"
  });
  await sendEmail({ toEmail, subject: "🎉 Welcome to Our Beaubless Platform!", htmlContent: html, name: userData.name });
};

export const sendContactQueryAdmin = async (orderData) => {
  const html = renderTemplate("sendContactQueryAdmin.ejs", { order: orderData });
  await sendEmail({ toEmail: "Sadhna@beaubless.com", subject: "🛍️ New Enquiry!", htmlContent: html });
};

export const sendContactQueryClient = async (orderData) => {
  const html = renderTemplate("sendContactQueryClient.ejs", { order: orderData });
  await sendEmail({ toEmail: orderData.email, subject: "🛍️ New Enquiry!", htmlContent: html, name: orderData.name });
};
