const User = require("../models/user_model");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();
const jwt = require("jsonwebtoken");
const PlanPassing = require('../models/order_model'); // Path to your schema file
const e = require("express");


/**
 * =====================================
 * LOGIN CONTROLLER
 * Email OR Phone + Password
 * =====================================
 */
exports.loginUser = async (req, res) => {
  try {
    const { email,
      // phonenumber, countryCode,
      password } = req.body;

    if (!password || !email) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const token = await User.matchPasswordAndGenerateToken({
      email,
      // phonenumber,
      // countryCode,
      password,
    });

    // Update user activity
    const query = email
      ? { email }
      : {
        phonenumbers: {
          $elemMatch: { countryCode, number: phonenumber },
        },
      };

    await User.findOneAndUpdate(query, {
      isActive: true,
      lastSeen: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message || "Login failed",
    });
  }
};

// Create a new Plan Passing entry
exports.createPlanPassing = async (req, res) => {
  try {
    const {
      form_type,
      category,
      property,
      client_details,
      payment_details,
      status
    } = req.body;

    // 1. Logic to auto-calculate balance if not provided by frontend
    const amount = payment_details?.amount || 0;
    const advance = payment_details?.advance || 0;
    const calculatedBalance = amount - advance;
    // const isCreating = !contact_id || contact_id == "0";
    const generatedId = new mongoose.Types.ObjectId();

    // 2. Create a new document instance
    const newPlan = new PlanPassing({
      _id: generatedId,
      order_id: generatedId,
      form_type,
      category,
      property,
      client_details,
      payment_details: {
        ...payment_details,
        balance: payment_details?.balance ?? calculatedBalance
      },
      status: status || 'Draft'
    });

    // 3. Save to MongoDB
    const savedPlan = await newPlan.save();

    res.status(200).json({
      success: true,
      message: "Plan Passing Form submitted successfully",
      data: savedPlan
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error creating plan entry",
      error: error.message
    });
  }
};

// Get all Plan Passing entries
exports.getAllPlans = async (req, res) => {
  try {
    // Fetches all documents and sorts them by newest first
    const plans = await PlanPassing.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: plans.length,
      data: plans
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error: Could not retrieve plans",
      error: error.message
    });
  }
};

// Get specific order details by Order ID
exports.getPlanByOrderId = async (req, res) => {
  try {
    const { order_id } = req.body;

    // Find the document in the property/client structure
    const plan = await PlanPassing.findOne({ "order_id": order_id });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    res.status(200).json({
      success: true,
      data: plan
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching order details",
      error: error.message
    });
  }
};

// PUT/PATCH: Update Property and Client details only
exports.updateGeneralDetails = async (req, res) => {
  try {
    const { order_id } = req.body;
    const { form_type, category, property, client_details, status } = req.body;

    const updatedOrder = await PlanPassing.findOneAndUpdate(
      { order_id: order_id },
      {
        $set: {
          form_type: form_type,
          category: category,
          property: property,
          client_details: client_details,
          status: status
        }
      },
      { new: true, runValidators: true }
    );

    if (!updatedOrder) return res.status(404).json({ message: "Order not found" });

    res.status(200).json({ success: true, data: updatedOrder });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// PUT/PATCH: Update Payment details only
exports.updatePaymentDetails = async (req, res) => {
  try {
    const { order_id } = req.body;
    const { amount, extra_payment } = req.body.payment_details;

    // Auto-calculate the balance
    const order = await PlanPassing.findOne({ order_id: order_id });
    if (!order) return res.status(404).json({ message: "Order not found" });

    const lastBalance = order.payment_details.balance || 0;
    const lastAdvance = order.payment_details.advance || 0;

    // const balance = amount - extra_payment;
    const advance = lastAdvance + extra_payment;
    if (amount) {
      order.payment_details.amount = amount;
      const newBalance = amount - advance;
      order.payment_details.balance = newBalance;
      order.payment_details.advance = advance;
      await order.save();
      return res.status(200).json({ success: true, data: order });
    } else {
      order.payment_details.advance = advance;
      order.payment_details.balance = lastBalance - extra_payment;
      await order.save();
      return res.status(200).json({ success: true, data: order });
    }

  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Admin: Create a new user
exports.adminCreateUser = async (req, res) => {
  try {
    const {
      firstname,
      lastname,
      email,
      password,
      gender,
      designation,
      countryCode,
      number
    } = req.body;

    // 1. Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }

    if (!firstname || !lastname || !email || !password) {
      return res.status(400).json({ success: false, message: "Required fields are missing" });
    }

    // 2. Create new user instance 
    // Note: The password will be hashed automatically by your userSchema.pre("save") hook
    const newUser = new User({
      firstname,
      lastname,
      email,
      password,
      gender,
      designation,
      role: "user",
      isVerified: true, // Admin created users can be pre-verified
      phonenumbers: [{ countryCode, number }]
    });

    await newUser.save();

    // 3. Email Setup (Nodemailer)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // Your Gmail
        pass: process.env.EMAIL_PASS  // Your App Password
      }
    });

    // 4. Proper HTML Email Format
    const htmlTemplate = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
            <div style="background-color: #4A90E2; padding: 20px; text-align: center; color: white;">
                <h1>Welcome, ${firstname}!</h1>
            </div>
            <div style="padding: 30px; line-height: 1.6; color: #333;">
                <p>Hello <strong>${firstname} ${lastname}</strong>,</p>
                <p>An administrator has created an account for you in our system. You can now log in using the credentials below:</p>
                
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 5px solid #4A90E2;">
                    <p style="margin: 5px 0;"><strong>Login Email:</strong> ${email}</p>
                    <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <span style="color: #d9534f;">${password}</span></p>
                </div>

                <p>For your security, please change your password immediately after logging in.</p>
                
                <div style="text-align: center; margin-top: 30px;">
                    <a href="#" style="background-color: #4A90E2; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Login to Your Account</a>
                </div>
            </div>
            <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 12px; color: #777;">
                <p>This is an automated message. Please do not reply to this email.</p>
            </div>
        </div>
        `;

    const mailOptions = {
      from: '"Admin Support" <' + process.env.EMAIL_USER + '>',
      to: email,
      subject: 'Your Account Credentials',
      html: htmlTemplate
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({
      success: true,
      message: "User created successfully and email sent!",
      userId: newUser._id
    });

  } catch (error) {
    console.error("User Creation Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT: Admin adds funds to user's cache_credits
exports.addFundsToUser = async (req, res) => {
  try {
    const { userId, amountToAdd } = req.body;

    // 1. Validation
    if (!amountToAdd || amountToAdd <= 0) {
      return res.status(400).json({ message: "Please provide a valid amount greater than 0" });
    }

    // 2. Update the user using $inc (increment)
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $inc: { cache_credits: amountToAdd } },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: `Successfully added ${amountToAdd} credits to ${updatedUser.firstname}'s account.`,
      newBalance: updatedUser.cache_credits
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET: Fetch all users
exports.getAllUsers = async (req, res) => {
    try {
        // .select("-password -salt") ensures we don't send sensitive data to the frontend
        const users = await User.find({ role: "user" }).select("-password -salt").sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET: Fetch a single user by ID
exports.getUserById = async (req, res) => {
    try {
        const { id } = req.body;

        const user = await User.findById(id).select("-password -salt");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        // Catch invalid MongoDB ObjectID format errors
        if (error.kind === "ObjectId") {
            return res.status(400).json({ success: false, message: "Invalid User ID format" });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};