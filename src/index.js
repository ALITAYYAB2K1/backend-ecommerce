// Must be first import to ensure environment variables are loaded
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file in the project root
dotenv.config({ path: join(dirname(__dirname), ".env") });

// Now log to check if variables are loaded
console.log("Environment Variables Check:", {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  CLOUDINARY_VARS_EXIST: {
    cloud_name: !!process.env.CLOUDINARY_CLOUD_NAME,
    api_key: !!process.env.CLOUDINARY_API_KEY,
    api_secret: !!process.env.CLOUDINARY_API_SECRET,
  },
});

// Now we can import modules that depend on environment variables
import connectDB from "./db/index.js";
import app from "./app.js";

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8080, () => {
      console.log(`Server is running on port ${process.env.PORT || 8080}`);
    });
  })
  .catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  });
