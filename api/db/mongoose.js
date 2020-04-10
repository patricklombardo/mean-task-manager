// This file will handle connection logic to MongoDB
const mongoose = require("mongoose");

// Use standard JS Promise
mongoose.Promise = global.Promise;

// Connect to MongoDB Instance
mongoose
  .connect("mongodb://localhost:27017/TaskManager", {
    useNewUrlParser: true,
  })
  .then(() => {
    console.log("Connection successful!");
  })
  .catch((e) => {
    console.log("Error while attempting to connect to MongoDB:");
    console.log(e);
  });

// Prevent Deprecation Warnings
mongoose.set("useCreateIndex", true);
mongoose.set("useFindAndModify", true);

module.exports = {
  mongoose,
};
