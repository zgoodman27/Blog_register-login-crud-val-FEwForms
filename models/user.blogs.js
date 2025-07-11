// import modules from mongoose
const { Schema, model } = require("mongoose");

// create a schema for the user model
const blogSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: "User", // reference the User model
    required: true, // the author field is required
  },
  createdAt: {
    type: Date,
    default: Date.now, // automatically set the createdAt field to the current date and time
  },
  updatedAt: {
    type: Date,
    default: Date.now, // automatically set the updatedAt field to the current date and time
  },
});

const Blog = model("Blog", blogSchema);

// create the user model using the schema
module.exports = Blog;
