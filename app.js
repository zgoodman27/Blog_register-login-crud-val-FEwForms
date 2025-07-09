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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
