import Contact from "../models/contactModel.js";
import { sendContactQueryClient,sendContactQueryAdmin } from "../controllers/emailController.js";

export const createContactController = async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const newContact = new Contact({ name, email, message });
    await newContact.save();
    
    await Promise.all([
          sendContactQueryAdmin({ name, email, message }),
          sendContactQueryClient({ name, email, message }),
        ]);
    
      res.status(200).json({
      success: true,
      message: "Message received successfully",
      contact: newContact,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
// Get All Contacts
export const getAllContactsController = async (req, res) => {
    try {
      const contacts = await Contact.find();
      res.status(200).json({
        success: true,
        message: "All Contacts Fetched Successfully",
        contacts,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message,
      });
    }
  };
  
  // Get Contact by ID
  export const getContactByIdController = async (req, res) => {
    try {
      const contact = await Contact.findById(req.params.id);
      if (!contact) {
        return res.status(404).json({
          success: false,
          message: "Contact not found",
        });
      }
      res.status(200).json({
        success: true,
        message: "Contact Fetched Successfully",
        contact,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message,
      });
    }
  };
  
  // Update Contact
  export const updateContactController = async (req, res) => {
    try {
      const { name, email, message } = req.body;
      const contact = await Contact.findByIdAndUpdate(req.params.id, { name, email, message }, { new: true });
      if (!contact) {
        return res.status(404).json({
          success: false,
          message: "Contact not found",
        });
      }
      res.status(200).json({
        success: true,
        message: "Contact Updated Successfully",
        contact,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message,
      });
    }
  };
  
  // Delete Contact
  export const deleteContactController = async (req, res) => {
    try {
      const contact = await Contact.findByIdAndDelete(req.params.id);
      if (!contact) {
        return res.status(404).json({
          success: false,
          message: "Contact not found",
        });
      }
      res.status(200).json({
        success: true,
        message: "Contact Deleted Successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message,
      });
    }
  };
  