require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/user_model");

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("✅ MongoDB connected");

    const adminEmail = "admin@example.com";

    const existingAdmin = await User.findOne({
      email: adminEmail,
      role: "admin",
    });

    if (existingAdmin) {
      console.log("⚠️ Admin already exists");
      process.exit(0);
    }

    const admin = new User({
      firstname: "Super",
      lastname: "Admin",
      email: adminEmail,
      password: "Admin@123", // 🔐 hashed automatically
      role: "admin",
      isVerified: true,
      isActive: true,
    });

    await admin.save();

    console.log("✅ Admin created successfully");
    console.log("📧 Email:", adminEmail);
    console.log("🔑 Password: Admin@123");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating admin:", error);
    process.exit(1);
  }
};

createAdmin();
