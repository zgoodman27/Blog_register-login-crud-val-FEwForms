const express = require("express");
const User = require("./models/user.model");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

// load environment variables
dotenv.config();

const app = express();

const PORT = process.env.PORT || 8080;
const MONGO = process.env.MONGODB;

console.log(`MONGO: ${MONGO}`);

// Middleware to parse JSON request bodies
app.use(express.json());

// connect to MongoDB
mongoose.connect(`${MONGO}/class34Blog`);
const db = mongoose.connection;
db.once("open", () => {
  console.log(`connected: ${MONGO}`);
});

// Middleware to enable jwt
const validateSession = async (req, res, next) => {
  try {
    const token = req.headers.authorization; //take the token provided
    const decodedToken = await jwt.verify(token, process.env.JWT_SECRET); //verify the token
    const user = await User.findById(decodedToken.id); //find the user by id in the token

    if (!user) {
      throw new Error("User not found");
    }
    req.user = user; //attach the user to the request object
    return next(); //call the next middleware
  } catch (error) {
    res.json({
      error: "Unauthorized",
    });
  }
};

const blog = require("./models/user.blogs.js"); // import the blog model

// create base get route to check if server is running
app.get("/api/health", (req, res) => {
  res.status(200).json({ message: "Server is healthy" });
});

// create a public route
app.get("/api/public", (req, res) => {
  res.status(200).json({ message: "This is a public endpoint" });
});

// create a protected route
app.get("/api/private", validateSession, (req, res) => {
  res.json({
    message: "This is a private route, please log in",
    user: req.user, // user data from the token
  });
});

// create a route to get all users
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find(); // find all users in the database
    res.status(200).json(users); // send the users back to the client
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Error fetching users" });
  }
});

// create a route to register a user
app.post("/api/register", async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    const user = new User({
      firstName,
      lastName,
      email,
      password: await bcrypt.hash(password, 10),
    }); // hash the password

    const newUser = await user.save(); // save the user to the database
    // create a token for the user
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(200).json({
      user: newUser,
      token: token, // send the token back to the user
      message: "User registered successfully!",
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({
      error: "Error registering user",
    });
  }
});

// create a route to log in a user
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const foundUser = await User.findOne({ email }); // find the user by email

    if (!foundUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const token = jwt.sign({ id: foundUser._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    }); // create a token for the user

    //send the user and token in the response
    res.status(200).json({
      user: foundUser,
      token: token,
      message: "User logged in successfully!",
    });
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({ error: "Error logging in user" });
  }
});

// create a route to post a blog
app.post("/api/blog", validateSession, async (req, res) => {
  try {
    const { title, content } = req.body; // get the blog data from the request
    const blogPost = new blog({
      title,
      content,
    }); // create a new blog post
    blogPost.author = req.user._id; // set the author of the blog post to the user id from the token
    const savedBlogPost = await blogPost.save(); // save the blog post to the database
    res.status(201).json({
      message: "Blog post created successfully",
      blog: savedBlogPost, // send the blog post back to the client
    });
  } catch (error) {
    console.error("Error creating blog post:", error);
    res.status(500).json({ error: "Error creating blog post" });
  }
});

//create a route to update a user
app.put("/api/update", validateSession, async (req, res) => {
  try {
    const userId = req.user._id; // get the user id from the request object
    const { firstName, lastName, email, password } = req.body; // get the updated data from the request body

    // hash the new password if it is provided
    const hashedPassword = password
      ? await bcrypt.hash(password, 10)
      : req.user.password;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { firstName, lastName, email, password: hashedPassword },
      { new: true } // return the updated user
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Error updating user" });
  }
});

// create a route to get a user by id
app.get("/api/user/:id", validateSession, async (req, res) => {
  try {
    const userId = req.params.id; // get the user id from the request parameters
    const user = await User.findById(userId); // find the user by id

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(user); // send the user back to the client
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Error fetching user" });
  }
});

// create a route to get all blogs
app.get("/api/blogs", async (req, res) => {
  try {
    const blogs = await blog
      .find()
      .populate("author", "firstName lastName email"); // find all blogs and populate the author field
    res.status(200).json(blogs); // send the blogs back to the client
  } catch (error) {
    console.error("Error fetching blogs:", error);
    res.status(500).json({ error: "Error fetching blogs" });
  }
});

// create a route to get a blog by user id
app.get("/api/blogs/:userId", async (req, res) => {
  try {
    const userId = req.params.userId; // get the user id from the request parameters
    const blogs = await blog
      .find({ author: userId })
      .populate("author", "firstName lastName email"); // find blogs by user id and populate the author field

    if (blogs.length === 0) {
      return res.status(404).json({ error: "No blogs found for this user" });
    }

    res.status(200).json(blogs); // send the blogs back to the client
  } catch (error) {
    console.error("Error fetching blogs by user:", error);
    res.status(500).json({ error: "Error fetching blogs by user" });
  }
});

//create a route to delete a user by id
app.delete("/api/delete/:id", validateSession, async (req, res) => {
  try {
    const userId = req.params.id; // get the user id from the request parameters
    const deletedUser = await User.findByIdAndDelete(userId); // delete the user by id

    if (!deletedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Error deleting user" });
  }
});

//create a route to delete a blog by user id
app.delete("/api/blogs/:userId/delete", validateSession, async (req, res) => {
  try {
    const userId = req.params.userId; // get the user ID from the request parameters
    const deletedBlogs = await blog.deleteMany({ author: userId }); // delete all blogs by the user
    if (deletedBlogs.deletedCount === 0) {
      return res.status(404).json({ error: "No blogs found for this user" });
    }
    res.status(200).json({ message: "Blogs deleted successfully" });
  } catch (error) {
    console.error("Error deleting blogs:", error);
    res.status(500).json({ error: "Error deleting blogs" });
  }
});

// create a route to delete all users blogs
app.delete("/api/blogs/deleteall", validateSession, async (req, res) => {
  try {
    const userId = req.user._id; // get the user id from the request object
    const deletedBlogs = await blog.deleteMany({ author: userId }); // delete all blogs by the user

    if (deletedBlogs.deletedCount === 0) {
      return res.status(404).json({ error: "No blogs found for this user" });
    }

    res.status(200).json({ message: "All blogs deleted successfully" });
  } catch (error) {
    console.error("Error deleting blogs:", error);
    res.status(500).json({ error: "Error deleting blogs" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
