// import modules from mongoose
const { Schema, model } = require("mongoose")

// create a schema for the user model
const userSchema = new Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    }
})

// create the user model using the schema
module.exports = model("User", userSchema)