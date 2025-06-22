const mongoose = require("mongoose");
const chatSchema = new mongoose.Schema({
  userId: mongoose.Types.ObjectId,
  messages: [
    {
      sender: { type: String, enum: ["user", "admin"] },
      text: String,
      timestamp: { type: Date, default: Date.now },
    },
  ],
});

export const Chat = mongoose.model("Chat", chatSchema);
