const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const Expense = require('../models/user_expence_model');
const User = require('../models/user_model');

exports.createExpense = async (req, res) => {
    try {
        console.log(req.body);
        
        const { fullName, amount } = req.body;
        console.log(req.body.fullName);
        
        const file = req.file;
        const userId = req.user._id; // Assuming user ID is available in req.user

        // 1. Check if User has enough balance
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (user.cache_credits < amount) {
            return res.status(400).json({ message: "Insufficient balance in cache_credits" });
        }

        console.log(file.path);

        // 2. Create the Expense Record
        const newExpense = new Expense({
            fullName,
            amount: Number(amount),
            receiptPath: file ? file.path : null,
            createdBy: userId
        });
        await newExpense.save();

        // 3. Subtract amount from User's cache_credits
        user.cache_credits -= Number(amount);
        await user.save();

        res.status(201).json({
            success: true,
            message: "Expense created and balance updated",
            remainingBalance: user.cache_credits,
            data: newExpense
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};


// GET: Fetch all expenses
exports.getAllExpenses = async (req, res) => {
    try {
        const userId = req.user._id;
        // .populate('createdBy', 'firstname lastname email') 
        // joins the User table to show who created the expense
        const expenses = await Expense.find({ createdBy: userId })
            .populate('createdBy', 'firstname lastname email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: expenses.length,
            data: expenses
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// GET: Fetch single expense by ID
exports.getExpenseById = async (req, res) => {
    try {
        const { id } = req.body;

        const expense = await Expense.findById(id)
            .populate('createdBy', 'firstname lastname email');

        if (!expense) {
            return res.status(404).json({ success: false, message: "Expense record not found" });
        }

        res.status(200).json({
            success: true,
            data: expense
        });
    } catch (error) {
        if (error.kind === "ObjectId") {
            return res.status(400).json({ success: false, message: "Invalid Expense ID format" });
        }
        res.status(500).json({ success: false, error: error.message });
    }
};