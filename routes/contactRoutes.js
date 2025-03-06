import express from "express";
import {
  createContactController,
  getAllContactsController,
  getContactByIdController,
  updateContactController,
  deleteContactController,
} from "../controllers/contactController.js";

const router = express.Router();

// Create Contact
router.post("/contact", createContactController);

// Get All Contacts
router.get("/contacts", getAllContactsController);

// Get Contact By ID
router.get("/contact/:id", getContactByIdController);

// Update Contact
router.put("/contact/:id", updateContactController);

// Delete Contact
router.delete("/contact/:id", deleteContactController);

export default router;