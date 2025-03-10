import JWT from "jsonwebtoken";
import User from "../models/userModel.js";

//user access


export const requireSignIn = async (req, res, next) => {
  try {
    // Check if token is provided
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ success: false, message: "Access Denied. No token provided!" });
    }

    // Verify token
    const decoded = JWT.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded._id).select("-password"); // Fetch full user data

    if (!req.user) {
      return res.status(404).json({ success: false, message: "User not found!" });
    }

    // Call next middleware
    next();
  } catch (error) {
    console.error("JWT Verification Error:", error);
    return res.status(401).json({ success: false, message: "Invalid or expired token!" });
  }
};



//Admin access

export const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (user.role !== 1) {
      return res.status(401).send({
        success: false,
        message: "unAuthorized Access",
      });
    } else {
      next();
    }
  } catch (error) {
    console.log(error);
    res.status(401).send({
      success: false,
      message: "admin error",
      error,
    });
  }
};
