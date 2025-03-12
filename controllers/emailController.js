import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables

const transporter = nodemailer.createTransport({
host: "smtppro.zoho.in",
  port: 465,
  secure: true,
  auth: {
    user: process.env.ZOHO_EMAIL, // Your Zoho email
    pass: process.env.ZOHO_PASSWORD, // Your Zoho password or App Password
  },
});
async function verifySMTPConnection() {
  try {
    await transporter.verify();
    console.log("✅ SMTP Connected Successfully!");
  } catch (error) {
    console.warn("⚠️ SMTP Warning: Connection issue detected.", error.message);
  }
}
// Function to send order status update email
export const sendOrderStatusEmail = async (toEmail, orderId, newStatus) => {
  try {
    const mailOptions = {
      from: process.env.ZOHO_EMAIL,
      to: toEmail,
      subject: `Order #${orderId} - Status Update`,
      html: `<p>Dear Customer,</p>
             <p>Your order <strong>#${orderId}</strong> has been updated to: <strong>${newStatus}</strong>.</p>
             <p>Thank you for shopping with us!</p>
             <p>Best Regards, <br/> Your Company</p>`,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Order update email sent to ${toEmail}`);
  } catch (error) {
    console.error("❌ Error sending email:", error);
  }
};
