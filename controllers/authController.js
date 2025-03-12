// import { hashPassword } from "../helpers/authHelper.js";
// import User from "../models/userModel.js";
// export const authRegisterController = async (req, res) => {
//   try {
//     const { name, email, password } = req.body;

//     if (!name || !email || !password) {
//       return res.status(400).json({ message: "All fields are required" });
//     }

//     //check user already exist
//     const userExist = await User.findOne({ email });
//     if (userExist) {
//       return res.status(400).json({ message: "User already exist" });
//     }

//     //hash password
//     const hashedPassword = await hashPassword(password);

//     //create new user
//     const newUser = await new User({
//       name,
//       email,
//       password: hashedPassword,
//     }).save();

//     res.status(201).send({
//       success: true,
//       message: "User Register successfully",
//       newUser,
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

import { comparePassword, hashPassword } from "../helpers/authHelper.js";
import User from "../models/userModel.js";
import JWT from "jsonwebtoken";
import nodemailer from "nodemailer";
import crypto from "crypto";

const transporter = nodemailer.createTransport({
  host: "smtppro.zoho.in",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
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

// Call the function
verifySMTPConnection();

export const registerController = async (req, res) => {
  try {
    const { name, email, password, phone, address, role, answer } = req.body;

    // Validation
    if (!name) return res.status(400).send({ message: "Name is required" });
    if (!email) return res.status(400).send({ message: "Email is required" });
    if (!password) return res.status(400).send({ message: "Password is required" });
    if (!phone) return res.status(400).send({ message: "Phone is required" });
    if (!answer) return res.status(400).send({ message: "Security answer is required" });

    if (!address || typeof address !== "object") {
      return res.status(400).send({ message: "Valid address is required" });
    }

    const { houseNo, street, city, state, country, pincode } = address;
    if (!houseNo) return res.status(400).send({ message: "House No is required" });
    if (!street) return res.status(400).send({ message: "Street is required" });
    if (!city) return res.status(400).send({ message: "City is required" });
    if (!state) return res.status(400).send({ message: "State is required" });
    if (!country) return res.status(400).send({ message: "Country is required" });
    if (!pincode) return res.status(400).send({ message: "Pincode is required" });

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).send({
        success: false,
        message: "User already registered, please log in",
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Save user
    const user = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      address: {
        houseNo,
        street,
        city,
        state,
        country,
        pincode,
      },
      role: role || 0, // Default to 'User' if not provided
      answer,
    });

    await user.save();

    res.status(201).send({
      success: true,
      message: "User registered successfully",
      user,
    });

  } catch (error) {
    console.error(error);
    res.status(500).send({
      success: false,
      message: "Error in registration",
      error,
    });
  }
};


//login
export const loginController = async (req, res) => {
  try {
    const { email, password } = req.body;
    //validation
    if (!email || !password) {
      return res.status(404).send({
        success: false,
        message: "Invalid email or password",
      });
    }
    //check user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send({
        success: false,
        message: "Email is not registerd",
      });
    }
    //compare password
    const match = await comparePassword(password, user.password);
    if (!match) {
      return res.status(404).send({
        success: false,
        message: "Invalid password",
      });
    }
    //token
    const token = await JWT.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(200).send({
      success: true,
      message: "Login successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error in login",
      error,
    });
  }
};

//test controller

export const testController = (req, res) => {
  res.send("user protected");
};

//forgotPassword controller

export const forgotPasswordController = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).send({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send({
        success: false,
        message: "User with this email does not exist",
      });
    }

    // Generate Reset Token
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // Token valid for 1 hour
    await user.save();

    // Password Reset Link
    const resetLink = `https://yourfrontend.com/reset-password/${resetToken}`;

    // Send Email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset Request",
      html: `<p>You requested a password reset. Click the link below to set a new password:</p>
             <a href="${resetLink}">${resetLink}</a>
             <p>If you did not request this, please ignore this email.</p>`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).send({
      success: true,
      message: "Password reset link sent to your email.",
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).send({
      success: false,
      message: "Something went wrong",
      error,
    });
  }
};

//update profile
export const updateProfileController = async (req, res) => {
  try {
    const { name, email, password, address, phone } = req.body;
    const user = await User.findOne({ email });

    //password
    if (password && password.length < 6) {
      return res.status(400).send({
        success: false,
        message: "Password must contain 6 characters",
      });
    }

    //hash password
    const hashedPassword = password ? await hashPassword(password) : undefined;
    const updateUser = await User.findOneAndUpdate(
      user._id,
      {
        name: name || user.name,
        password: hashedPassword || user.password,
        address: address || user.address,
        phone: phone || user.phone,
      },
      { new: true }
    );
    res.status(200).send({
      success: true,
      message: "Profile Update Successfully",
      updateUser,
    });
  } catch (error) {
    console.log(`Error while update user profile ${error}`);
    res.status(404).send({
      success: false,
      message: "Error while update user profile",
      error,
    });
  }
};
