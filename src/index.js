// Must be first import to ensure environment variables are loaded
import dotenv from "dotenv";
dotenv.config();

// Now we can import modules that depend on environment variables
import connectDB from "./db/index.js";
import app from "./app.js";
connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running on port ${process.env.PORT || 8000}`);
    });
  })
  .catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  });
