import nodemailer from "nodemailer";
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

// Central FROM email format
const FROM_EMAIL = `"${process.env.BRAND_NAME || "Your Brand"}" <${process.env.ZOHO_EMAIL}>`;

// 🔧 Create Zoho SMTP transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.in',
  port: 465,
  secure: true,
  auth: {
      user: 'care@beaubless.com',
      pass: 'RhpWfAQZ2vfr'
  },
  logger:false,
  debug: false
});

// ✅ Check SMTP connection once at server start
export async function verifySMTPConnection() {
  try {
    await transporter.verify();
    console.log("✅ SMTP Connected Successfully!");
  } catch (error) {
    console.warn("⚠️ SMTP Warning: Connection issue detected.", error.message);
  }
}

// 📦 Send Order Placed Email
export const sendOrderPlacedMail = async (toEmail, orderData) => {
  try {
    const templatePath = path.join(__dirname, "../views/email/orderPlaced.ejs");
    const template = fs.readFileSync(templatePath, "utf-8");
    const htmlContent = ejs.render(template, { order: orderData });

    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to: toEmail,
      subject: "🛍️ Your Order Has Been Placed!",
      html: htmlContent,
    });

    console.log("📧 Order confirmation mail sent:", info.messageId);
  } catch (error) {
    console.error("❌ Failed to send order email:", error.message);
  }
};
// 📦 Send Order Placed Email
export const sendOrderPlacedMailAdmin = async (orderData) => {
  try {
    const templatePath = path.join(__dirname, "../views/email/orderPlacedinternal.ejs");
    const template = fs.readFileSync(templatePath, "utf-8");
    const htmlContent = ejs.render(template, { order: orderData });

    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to: 'care@beaubless.com',
      subject: "🛍️ New Order Received!",
      html: htmlContent,
    });

    console.log("📧 Order confirmation mail sent:", info.messageId);
  } catch (error) {
    console.error("❌ Failed to send order email:", error.message);
  }
};

// 🚚 Send Order Status Update Email
export const sendOrderStatusEmail = async (toEmail, data) => {
  const { orderId, newStatus, data: order } = data;

  try {
    const templatePath = path.join(__dirname, "../views/email/orderStatus.ejs");
    const template = fs.readFileSync(templatePath, "utf-8");
    const htmlContent = ejs.render(template, { orderId, newStatus, data: order });

    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to: toEmail,
      subject: `📦 Order #${orderId} - Status Update`,
      html: htmlContent,
    });

    console.log(`✅ Order status update mail sent to ${toEmail}`);
  } catch (error) {
    console.error("❌ Error sending order status email:", error.message);
  }
};

export const sendRegistrationEmail = async (toEmail, userData) => {
  try {
    const templatePath = path.join(__dirname, "../views/email/registration.ejs");
    const template = fs.readFileSync(templatePath, "utf-8");
    const htmlContent = ejs.render(template, {
      user: userData,
      brand: process.env.BRAND_NAME || "Your Company"
    });

    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to: toEmail,
      subject: "🎉 Welcome to Our Beaubless Platform!",
      html: htmlContent,
    });

    console.log("📧 Registration email sent:", info.messageId);
  } catch (error) {
    console.error("❌ Failed to send registration email:", error.message);
  }
};
