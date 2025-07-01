import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Fix for ESM to find correct path to .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Hardcoded fallback URI in case .env isn't loaded
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/your-database-name";

console.log(
  "MongoDB URI being used (partial):",
  MONGODB_URI.substring(0, 15) + "..."
);

const resetAdminPassword = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to database");

    const email = "ejazstore014@gmail.com";
    const newPassword = "EjazBajoor@911";

    // Hash the password directly with bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update the user document with the new password
    const result = await mongoose.connection
      .collection("users")
      .updateOne({ email }, { $set: { password: hashedPassword } });

    console.log("Password reset result:", result);

    // Verify the update worked
    if (result.modifiedCount === 1) {
      console.log("✅ Password updated successfully!");
      console.log(`You can now log in with:`);
      console.log(`Email: ${email}`);
      console.log(`Password: ${newPassword}`);
    } else {
      console.log("❌ Password update failed.");
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
  }
};

resetAdminPassword();
