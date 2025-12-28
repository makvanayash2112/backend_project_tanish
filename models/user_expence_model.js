const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    amount: { type: Number, required: true },
    receiptPath: { type: String }, // Stores the local folder path
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    }
}, { timestamps: true });

module.exports = mongoose.model("Expense", expenseSchema);