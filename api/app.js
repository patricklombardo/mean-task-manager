const express = require("express");
const bodyParser = require("body-parser");
const app = express();

const { mongoose } = require("./db/mongoose");

// Losd Mongoose Models
const { List, Task, User } = require("./db/models");

// Load Middleware
app.use(bodyParser.json());

// Enable CORS
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, HEAD, OPTIONS, PUT, PATCH, DELETE"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// Route Handlers

/** LIST ROUTES **/

/**
 * GET Lists
 * Purpose: Get all lists
 */
app.get("/lists", (req, res) => {
  // Return an array of all lists in the database
  List.find().then((lists) => {
    res.send(lists);
  });
});

/**
 * POST Lists
 * Purpose: Add a list
 */
app.post("/lists", (req, res) => {
  // Create a new list and return the new list document to the user
  // Includes ID
  // Note: The list fields will be passed in via the JSON request body
  let title = req.body.title;

  let newList = new List({
    title,
  });
  newList.save().then((listDoc) => {
    // Send the updated list doc
    res.send(listDoc);
  });
});

/**
 * PATCH Lists
 * Purpose: Updates a specified list
 */
app.patch("/lists/:id", (req, res) => {
  // We want to update the specified list (list document with id in the URL) with the new values specified in the JSON body of the request
  List.findOneAndUpdate(
    { _id: req.params.id, _userId: req.user_id },
    {
      $set: req.body,
    }
  ).then(() => {
    res.send({ message: "updated successfully" });
  });
});

/**
 * DELETE
 * Deletes a specified list
 */
app.delete("/lists/:id", (req, res) => {
  // Deletes a list
  List.findOneAndRemove({
    _id: req.params.id,
  }).then((removedListDoc) => {
    res.send(removedListDoc);
  });
});

/** TASK ROUTES **/

/**
 * GET /lists/:listid/tasks
 * Purpose: Get all the tasks related to a list
 */
app.get("/lists/:listId/tasks", (req, res) => {
  // Return all tasks related to a list id
  Task.find({
    _listId: req.params.listId,
  }).then((tasks) => {
    res.send(tasks);
  });
});

/**
 * POST
 * Purpose: post a new task to a given list
 */
app.post("/lists/:listId/tasks", (req, res) => {
  // Create a new task for the specified list
  let newTask = new Task({
    title: req.body.title,
    _listId: req.params.listId,
  });
  newTask.save().then((newTaskDoc) => {
    res.send(newTaskDoc);
  });
});

/**
 * PATCH /lists/:listId/tasks/:taskId
 * Purpose: updates a task
 */

app.patch("/lists/:listId/tasks/:taskId", (req, res) => {
  // Update a specified task

  Task.findOneAndUpdate(
    {
      _id: req.params.taskId,
      _listId: req.params.listId,
    },
    {
      $set: req.body,
    }
  ).then(() => {
    res.send({ message: "Updated Successfully" });
  });
});

/**
 * DELETE /lists/:listId/tasks/:taskId
 * Purpose: delete a given task
 */

app.delete("/lists/:listId/tasks/:taskId", (req, res) => {
  Task.findOneAndRemove({
    _id: req.params.taskId,
    _listId: req.params.listId,
  }).then((removedTaskDoc) => {
    res.send(removedTaskDoc);
  });
});

/** USER ROUTES **/

/**
 * POST /users
 * Purpose: Sign up
 */

app.post("/users", (req, res) => {
  // User sign up

  let body = req.body;
  let newUser = new User(body);

  newUser
    .save()
    .then(() => {
      return newUser.createSession();
    })
    .then((refreshToken) => {
      // Session created successfully - return refresh token
      // Generate an access auth token

      return newUser.generateAccessAuthToken().then((accessToken) => {
        // Return auth and refresh token
        return { accessToken, refreshToken };
      });
    })
    .then((authTokens) => {
      // Construct response
      // Headers: Refresh token, auth token
      // Body: user object
      res
        .header("x-refresh-token", authTokens.refreshToken)
        .header("x-access-token", authTokens.accessToken)
        .send(newUser);
    })
    .catch((e) => {
      res.status(400).send(e);
    });
});

/**
 * POST /users/login
 * Purpose: Log in
 */

app.post("/users/login", (req, res) => {
  // Get email and password from the request body
  let { email, password } = req.body;

  // Find the user in the database
  User.findByCredentials(email, password)
    .then((user) => {
      return user
        .createSession()
        .then((refreshToken) => {
          // Session created
          // Generating access token
          return user.generateAccessAuthToken().then((accessToken) => {
            // Return object containing access and refresh tokens
            return { accessToken, refreshToken };
          });
        })
        .then((authTokens) => {
          // Send the response
          // Same as above
          res
            .header("x-refresh-token", authTokens.refreshToken)
            .header("x-access-token", authTokens.accessToken)
            .send(user);
        });
    })
    .catch((e) => {
      res.status(400).send(e);
    });
});

// Listen on Port 3000

app.listen(3000, () => {
  console.log("Server is listening on port 3000");
});
