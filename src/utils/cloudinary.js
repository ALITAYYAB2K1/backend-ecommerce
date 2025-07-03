import { v2 as cloudinary } from "cloudinary";
import DataURIParser from "datauri/parser.js";
import path from "path";
import fs from "fs";

// Force direct configuration with hardcoded values from your .env
// This bypasses any environment variable loading issues
cloudinary.config({
  cloud_name: "dutan9dsu",
  api_key: "599555579838858",
  api_secret: "ybPXdUJ37uvhioq6CIIqjCefHPU",
});

// Log the actual configuration values used
console.log("Cloudinary Direct Configuration:", {
  cloud_name: cloudinary.config().cloud_name,
  api_key_exists: !!cloudinary.config().api_key,
  api_secret_exists: !!cloudinary.config().api_secret,
});

const parser = new DataURIParser();

const uploadOnCloudinary = async (filePath, folder = "") => {
  try {
    if (!filePath) {
      console.log("No file path provided to uploadOnCloudinary");
      return null;
    }

    console.log("Uploading file to Cloudinary:", {
      filePath,
      folder,
    });

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error("File not found at path:", filePath);
      return null;
    }

    // Extract file extension from path
    const fileFormat = path.extname(filePath);

    // Read file from disk and convert to data URI
    const fileBuffer = fs.readFileSync(filePath);
    const fileUri = parser.format(fileFormat, fileBuffer);

    // Upload to Cloudinary using a Promise
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        fileUri.content,
        {
          folder,
          resource_type: "auto",
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error);
            reject(error);
          } else {
            console.log("Cloudinary upload success:", result.url);

            // Delete the temporary file after successful upload
            try {
              fs.unlinkSync(filePath);
              console.log("Temporary file deleted:", filePath);
            } catch (err) {
              console.error("Error deleting temporary file:", err);
            }

            resolve(result);
          }
        }
      );
    });
  } catch (error) {
    console.error("Error in uploadOnCloudinary:", error);
    return null;
  }
};

export { uploadOnCloudinary };
