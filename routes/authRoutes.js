// import express from "express";
// import { authRegisterController } from "../controllers/authController.js";

// const router = express.Router();

// router.post("/register", authRegisterController);

// export default router;
import User from "../models/userModel.js";
import express from "express";
import upload from "../middlewares/multerConfig.js";
import {
  forgotPasswordController,
  loginController,
  registerController,
  testController,
  updateProfileController,
  addAddress, updateAddress, deleteAddress, setDefaultAddress,deleteUserController
} from "../controllers/authController.js";
import { isAdmin, requireSignIn } from "../middlewares/authMiddleware.js";
import { render } from "ejs";

//router object

const router = express.Router();

//routing
//REGISTER || METHOD POST
router.post("/register", registerController);
router.delete("/delete/:userId", deleteUserController);
//LOGIN || POST
router.post("/login", loginController);

//Forgot Password || POST
router.post("/forgot-password", forgotPasswordController);

//test
router.get("/test", requireSignIn, isAdmin, testController);

//Protected Rout auth
router.get("/user-auth", requireSignIn, (req, res) => {
  res.status(200).json({
    Status: "success",
    user: req.user, // Return user data if needed
  });
});


//admin auth route
router.get("/admin-auth", requireSignIn, isAdmin, (req, res) => {
  res.status(200).send({
    ok: true,
  });
});

//update profile
router.put("/update-profile", upload.array("image", 1), updateProfileController);
router.get("/getAllUser", async (req, res) => {
  try {
      const users = await User.find(); // Fetch users
      res.status(200).json({
          success: true, 
          users // Send as 'users' array
      });
  } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({
          success: false, 
          message: "Failed to fetch users", 
          error: error.message 
      });
  }
});


// Add a new address
router.post("/address/add", addAddress);

// Update an existing address
router.put("/address/update", updateAddress);

// Delete an address
router.delete("/address/delete", deleteAddress);

// Set a default address
router.get("/email/view-order", async (req, res) => {
render('')

});

export default router;
