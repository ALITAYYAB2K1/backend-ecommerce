import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Temporary hardcoded values for testing
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "de0trqals";
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || "343192345136392";
const CLOUDINARY_API_SECRET =
  process.env.CLOUDINARY_API_SECRET || "KDxS3Ag4EjiILDa8nDJ7idlWpA4";

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

// Test cloudinary configuration
console.log("Cloudinary Configuration:");
console.log("Cloud Name:", CLOUDINARY_CLOUD_NAME);
console.log("API Key:", CLOUDINARY_API_KEY ? "SET" : "NOT SET");
console.log("API Secret:", CLOUDINARY_API_SECRET ? "SET" : "NOT SET");

//upload file on cloudinary
const uploadOnCloudinary = async (localFilePath, folder = "uploads") => {
  try {
    if (!localFilePath) {
      console.log("No file path provided");
      return null;
    }

    // Check if file exists
    if (!fs.existsSync(localFilePath)) {
      console.log("File does not exist:", localFilePath);
      return null;
    }

    console.log("Attempting to upload file:", localFilePath);
    console.log("Cloudinary config check:", {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? "SET" : "NOT SET",
      api_key: process.env.CLOUDINARY_API_KEY ? "SET" : "NOT SET",
      api_secret: process.env.CLOUDINARY_API_SECRET ? "SET" : "NOT SET",
    });

    //upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      folder: folder,
    });

    //file has been uploaded
    console.log("File uploaded successfully on cloudinary", response.url);

    // Clean up local file after successful upload
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    return response;
  } catch (error) {
    // Clean up local file even if upload failed
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    console.log("Detailed error while uploading file on cloudinary:");
    console.log("Error message:", error.message);
    console.log("Error stack:", error.stack);
    console.log("Full error object:", error);

    return null;
  }
};

export { uploadOnCloudinary };
