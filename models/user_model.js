const { createHmac, randomBytes } = require("crypto");
const { Schema, model, mongoose } = require("mongoose");
const { createTokenforUser } = require("../services/authentication");

const userSchema = new Schema(
    {
        firstname: {
            type: String,
            // default: "Dummy Firstname",
        },
        lastname: {
            type: String,
            // default: "Dummy Lastname",
        },

        gender: {
            type: String,
            // default: "Dummy Lastname",
        },

        email: {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
            // default: null, // ✅ makes sure null is used instead of ""
        },

        emailVerificationToken: String,
        isVerified: {
            type: Boolean,
            default: false,
        },

        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user",
        },

        isActive: {
            type: Boolean,
            default: false, // user is inactive until login
        },

        lastSeen: { type: Date, default: null },

        phonenumbers: [
            {
                countryCode: {
                    type: String,
                },
                number: {
                    type: String,
                },
                _id: false, // Use the number as the unique identifier
            },
        ],

        salt: {
            type: String,
            // required: true,
        },
        password: {
            type: String,
            required: function () {
                // Only require password for local users
                return !this.provider || this.provider === "local";
            },
        },

        designation: {
            type: String,
            // default: "Dummy Firstname",
        },

        profileImageURL: {
            type: String,
        },

        // Cache for referral credits before they're applied to Stripe
        cache_credits: {
            type: Number,
            default: 0,
        },

        resetPasswordToken: { type: String },
        resetPasswordExpires: { type: Date },
    },
    { timestamps: true }
);

userSchema.pre("save", function (next) {
    const user = this;
    if (!user.isModified("password")) return next();

    const salt = randomBytes(16).toString();
    const hashPassword = createHmac("sha256", salt)
        .update(user.password)
        .digest("hex");

    this.salt = salt;
    this.password = hashPassword;
    next();
});

userSchema.static(
    "matchPasswordAndGenerateToken",
    async function ({ email, phonenumber, countryCode, password }) {
        if (!password || (!email && !phonenumber)) {
            throw new Error("Email or phone number and password are required");
        }

        const query = email
            ? { email }
            : // : { phonenumbers: { $in: [phonenumber] } }; // assuming you store phone numbers as array
            { phonenumbers: { $elemMatch: { countryCode, number: phonenumber } } };

        const user = await this.findOne(query);
        if (!user) throw new Error("User not found");

        const hash = createHmac("sha256", user.salt).update(password).digest("hex");
        if (hash !== user.password) throw new Error("Password not matched");

        return createTokenforUser(user);
    }
);

const User = model("User", userSchema);
module.exports = User;
