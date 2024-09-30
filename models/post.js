const mongoose = require("mongoose");
require("dotenv").config()

mongoose.connect(`${process.env.MONGODB_URL}/mini_social_media`);

const postSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user"
  },
  content: String,
  date: {
    type: Date,
    default: Date.now
  },
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user"
    }
  ]
});

module.exports = mongoose.model("post", postSchema);  