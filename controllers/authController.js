import { comparePassword, hashPassword } from "../helpers/authHelper.js";
import User from "../models/userModel.js";
import JWT from "jsonwebtoken";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { sendRegistrationEmail } from "../controllers/emailController.js";


export const registerController = async (req, res) => {
  try {
    const { firstName,lastName, email, password, phone, address, role, answer } = req.body;

    // Validation
    if (!firstName) return res.status(400).send({ message: "First Name is required" });
    if (!email) return res.status(400).send({ message: "Email is required" });
    if (!password) return res.status(400).send({ message: "Password is required" });
    if (!phone) return res.status(400).send({ message: "Phone is required" });
    // if (!answer) return res.status(400).send({ message: "Security answer is required" });

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
      firstName,
      lastName,
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
      role: role || "user", // Default to 'User' if not provided
    });

    await user.save();
    await sendRegistrationEmail(email, user);
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

export const deleteUserController = async (req, res) => {
  try {
    const { userId } = req.params; // Get user ID from request parameters

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send({
        success: false,
        message: "User not found",
      });
    }

    // Delete user
    await User.findByIdAndDelete(userId);

    res.status(200).send({
      success: true,
      message: "User deleted successfully",
    });

  } catch (error) {
    console.error(error);
    res.status(500).send({
      success: false,
      message: "Error deleting user",
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
        firstName: user.firstName,
        email: user.email,
        phone: user.phone,
        address: user.addresses,
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
    const { firstName, lastName, email, password, address, phone } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).send({ success: false, message: "User not found" });
    }

    // password check
    if (password && password.length < 6) {
      return res.status(400).send({
        success: false,
        message: "Password must contain 6 characters",
      });
    }

    // hash password
    const hashedPassword = password ? await hashPassword(password) : undefined;

    // Handle uploaded image
    let profilePhoto = user.profilePhoto;
    if (req.files && req.files.length > 0) {
      profilePhoto = req.files[0].path; // multer stores path here
    }

    const updateUser = await User.findOneAndUpdate(
      user._id,
      {
        firstName: firstName || user.firstName,
        lastName: lastName || user.lastName,
        password: hashedPassword || user.password,
        address: address || user.address,
        phone: phone || user.phone,
        profilePhoto, // ✅ save photo path
      },
      { new: true }
    );

    res.status(200).send({
      success: true,
      message: "Profile Updated Successfully",
      updateUser,
    });
  } catch (error) {
    console.log(`Error while updating user profile: ${error}`);
    res.status(500).send({
      success: false,
      message: "Error while updating user profile",
      error,
    });
  }
};




// Addresss

export const addAddress = async (req, res) => {
  try {
    console.log("Request Body:", req.body);

    // Extract userId and address fields correctly
    const { userId, houseNo, street, landmark, city, state, country, pincode } = req.body;

    if (!userId || !houseNo || !street || !city || !state || !country || !pincode) {
      return res.status(400).json({ success: false, message: "All fields are required!" });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found!" });
    }

    // Create new address object
    const newAddress = {
      houseNo,
      street,
      landmark: landmark || "", // Optional
      city,
      state,
      country,
      pincode,
      isDefault: user.addresses.length === 0, // First address is default
    };

    // Add to user's addresses array
    user.addresses.push(newAddress);
    await user.save();

    res.status(201).json({
      success: true,
      message: "Address added successfully",
      addresses: user.addresses,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, message: "Error adding address", error });
  }
};


export const updateAddress = async (req, res) => {
  try {
    const { userId, addressId, updatedAddress } = req.body.userId;

    // Ensure all required fields are provided
    if (!userId || !addressId || !updatedAddress) {
      console.log("called here")
      return res.status(400).json({ success: false, message: "Missing required fields!" });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found!" });
    }

    // Find the index of the address to update
    const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === addressId);
    if (addressIndex === -1) {
      return res.status(404).json({ success: false, message: "Address not found!" });
    }

    // Update the address fields dynamically
    Object.keys(updatedAddress).forEach(key => {
      user.addresses[addressIndex][key] = updatedAddress[key];
    });

    await user.save();

    res.status(200).json({
      success: true,
      message: "Address updated successfully",
      addresses: user.addresses,  // Return the updated list
    });
  } catch (error) {
    console.error("Update Address Error:", error);
    res.status(500).json({ success: false, message: "Error updating address", error });
  }
};

export const deleteAddress = async (req, res) => {
  try {
    const { userId, addressId } = req.body.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found!" });
    }

    user.addresses = user.addresses.filter(addr => addr._id.toString() !== addressId);
    await user.save();

    res.status(200).json({ success: true, message: "Address deleted successfully", user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting address", error });
  }
};
export const setDefaultAddress = async (req, res) => {
  try {
    const { userId, addressId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found!" });
    }

    user.addresses = user.addresses.map(addr =>
      addr._id.toString() === addressId ? { ...addr._doc, isDefault: true } : { ...addr._doc, isDefault: false }
    );

    await user.save();

    res.status(200).json({ success: true, message: "Default address set successfully", user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error setting default address", error });
  }
};
