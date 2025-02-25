// import express from "express";
// import { authRegisterController } from "../controllers/authController.js";

// const router = express.Router();

// router.post("/register", authRegisterController);

// export default router;

import express from "express";
import {
  forgotPasswordController,
  loginController,
  registerController,
  testController,
  updateProfileController,
} from "../controllers/authController.js";
import { isAdmin, requireSignIn } from "../middlewares/authMiddleware.js";

//router object

const router = express.Router();

//routing
//REGISTER || METHOD POST
router.post("/register", registerController);

//LOGIN || POST
router.post("/login", loginController);

//Forgot Password || POST
router.post("/forgot-password", forgotPasswordController);

//test
router.get("/test", requireSignIn, isAdmin, testController);

//Protected Rout auth
router.get("/user-auth", requireSignIn, (req, res) => {
  res.status(200).send({
    ok: true,
  });
});

//admin auth route
router.get("/admin-auth", requireSignIn, isAdmin, (req, res) => {
  res.status(200).send({
    ok: true,
  });
});

//update profile
router.put("/update-profile", updateProfileController);

export default router;
