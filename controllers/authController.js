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

export const registerController = async (req, res) => {
  try {
    const { name, email, password, phone, address, answer } = req.body;
    //validation
    if (!name) {
      return res.send({ message: "Name is required" });
    }
    if (!email) {
      return res.send({ message: "Email is required" });
    }
    if (!password) {
      return res.send({ message: "password is required" });
    }
    if (!phone) {
      return res.send({ message: "phone is required" });
    }
    if (!address) {
      return res.send({ message: "address is required" });
    }
    if (!answer) {
      return res.send({ message: "answer is required" });
    }
    //existing user

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(200).send({
        success: false,
        message: "User already regiter please login",
      });
    }

    //register user
    const hashedPassword = await hashPassword(password);
    //save
    const user = await new User({
      name,
      email,
      phone,
      address,
      password: hashedPassword,
      answer,
    }).save();

    res.status(201).send({
      success: true,
      message: "User Register successfully",
      user,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error in Registration",
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
    const { email, answer, newPassword } = req.body;
    if (!email) {
      res.status(400).send({ message: "Email is required" });
    }
    if (!answer) {
      res.status(400).send({ message: "Answer is required" });
    }
    if (!newPassword) {
      res.status(400).send({ message: "newPassword is required" });
    }

    //validation
    const user = await User.findOne({ email, answer });
    if (!user) {
      return res.status(404).send({
        success: false,
        message: "Wrong email Or answer",
      });
    }

    const hashNewPassword = await hashPassword(newPassword);
    await User.findByIdAndUpdate(user._id, { password: hashNewPassword });
    res.status(200).send({
      success: true,
      message: "Password Reset Successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Somthing wend wrong",
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
