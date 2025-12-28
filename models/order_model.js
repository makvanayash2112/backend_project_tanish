const mongoose = require('mongoose');

const planPassingSchema = new mongoose.Schema({

    order_id: {
        type: mongoose.Schema.Types.ObjectId,
        default: () => new mongoose.Types.ObjectId(),
        unique: true,
    },
    // --- Form Header ---
    form_type: { type: String, required: true }, // e.g., "Impact"
    category: { type: String }, // e.g., "AMC"

    // --- Property Details ---
    property: {
        tps: { type: String },
        rs: { type: String },
        cs: { type: String },
        op: { type: String },
        fp: { type: String },
        village: { type: String },
        town: { type: String },
        district: { type: String },
        zone: { type: String },
        use_type: { type: String }, // "Use" field
        home_shop: { type: String }
    },

    // --- Client Details ---
    client_details: {
        name: { type: String, required: true },
        mobile_number: { type: String, required: true },
        rct: { type: String },
        address: { type: String }
    },

    // --- Payment Details ---
    payment_details: {
        amount: { type: Number, default: 0 },
        advance: { type: Number, default: 0 },
        balance: { type: Number, default: 0 },
    },

    // --- System Fields ---
    status: {
        type: String,
        enum: ['Pending', 'Success', 'Rejected', 'Draft'],
        default: 'Draft'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('PlanPassing', planPassingSchema);