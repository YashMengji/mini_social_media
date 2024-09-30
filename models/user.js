const mongoose = require("mongoose");
require("dotenv").config()

mongoose.connect(`${process.env.MONGODB_URL}/mini_social_media`);

const userSchema = mongoose.Schema({
  username: String,
  password: String,
  name: String,
  age: Number,
  email: String,
  profileImg: {
    filename: {
      type: String,
    },
    contentType: {
      type: String, 
    },
    data: {
      type: Buffer,
    },
  },
  posts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "post"
    }
  ]
});

module.exports = mongoose.model("user", userSchema);