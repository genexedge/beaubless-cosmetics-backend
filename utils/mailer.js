const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const ejs = require("ejs");

const transporter = nodemailer.createTransport({
  host: "smtp.zoho.in",
  port: 465,
  secure: true,
  auth: {
    user: "your-email@zoho.in",
    pass: "your-app-password", // generate this in Zoho's app password section
  },
});

const sendOrderPlacedMail = async (toEmail, orderData) => {
  try {
    const templatePath = path.join(__dirname, "../views/email/orderPlaced.ejs");
    const template = fs.readFileSync(templatePath, "utf-8");

    const htmlContent = ejs.render(template, { order: orderData });

    const info = await transporter.sendMail({
      from: '"Your Brand Name" <your-email@zoho.in>',
      to: toEmail,
      subject: "Your Order Has Been Placed ✅",
      html: htmlContent,
    });

    console.log("📧 Order confirmation mail sent:", info.messageId);
  } catch (error) {
    console.error("❌ Failed to send order email:", error.message);
  }
};

module.exports = { sendOrderPlacedMail };
