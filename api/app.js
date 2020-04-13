const express = require("express");
const bodyParser = require("body-parser");
const { mongoose } = require("./db/mongoose");
const { List, Task, User } = require("./db/models");
const jwt = require("jsonwebtoken");

// Init App
const app = express();

// Load Middleware
app.use(bodyParser.json());

/** MIDDLEWARE **/

// Enable CORS
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, HEAD, OPTIONS, PUT, PATCH, DELETE"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, x-access-token, x-refresh-token, _id"
  );

  res.header(
    "Access-Control-Expose-Headers",
    "x-access-token, x-refresh-token"
  );

  next();
});

// Check whether the request has a valid jwt token
let authenticate = (req, res, next) => {
  let token = req.header("x-access-token");

  // verify the JWT
  jwt.verify(token, User.getJWTSecret(), (err, decoded) => {
    if (err) {
      // There was an error
      // JWT is invalid
      // DO NOT AUTHENTICATE
      res.status(401).send(err);
    } else {
      // Authenticate
      req.user_id = decoded._id;
      next();
    }
  });
};

// Verify Refresh Token Middleware
// Verifies the session
let verifySession = (req, res, next) => {
  let refreshToken = req.header("x-refresh-token");
  let _id = req.header("_id");

  User.findByIdAndToken(_id, refreshToken)
    .then((user) => {
      if (!user) {
        //User not found
        return Promise.reject({ error: "User not found" });
      }

      // User Found
      // Session refresh token exists
      // Validate if it is valid

      req.user_id = user._id;
      req.userObject = user;
      req.refreshToken = refreshToken;

      let isSessionValid = false;

      user.sessions.forEach((session) => {
        if (session.token === refreshToken) {
          // Verify that session is valid
          if (User.hasRefreshTokenExpired(session.expiresAt) === false) {
            // Refresh token valid
            isSessionValid = true;
          }
        }
      });

      if (isSessionValid) {
        // Session is valid
        // Call next to continue processing the request
        next();
      } else {
        // Session is invalid
        return Promise.reject({
          error: "Refresh token has expired or the session is invalid",
        });
      }
    })
    .catch((e) => {
      res.status(401).send(e);
    });
};

// Route Handlers

/** LIST ROUTES **/

/**
 * GET Lists
 * Purpose: Get all lists
 */
app.get("/lists", authenticate, (req, res) => {
  // Return an array of all lists in the database that belong to the authenticated user
  List.find({
    _userId: req.user_id,
  }).then((lists) => {
    res.send(lists);
  });
});

/**
 * POST Lists
 * Purpose: Add a list
 */
app.post("/lists", authenticate, (req, res) => {
  // Create a new list and return the new list document to the user
  // Includes ID
  // Note: The list fields will be passed in via the JSON request body
  let title = req.body.title;

  let newList = new List({
    title,
    _userId: req.user_id,
  });
  newList.save().then((listDoc) => {
    // Send the updated list doc
    res.send(listDoc);
  });
});

/**
 * PATCH /lists/:id
 * Purpose: Updates a specified list
 */
app.patch("/lists/:id", authenticate, (req, res) => {
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
 * DELETE /lists/:id
 * Deletes a specified list
 */
app.delete("/lists/:id", authenticate, (req, res) => {
  // Deletes a list
  List.findOneAndRemove({
    _id: req.params.id,
    _userId: req.user_id,
  }).then((removedListDoc) => {
    res.send(removedListDoc);

    // Delete all the tasks associated with a list
    deleteTasksFromList(removedListDoc._id);
  });
});

/** TASK ROUTES **/

/**
 * GET /lists/:listid/tasks
 * Purpose: Get all the tasks related to a list
 */
app.get("/lists/:listId/tasks", authenticate, (req, res) => {
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
app.post("/lists/:listId/tasks", authenticate, (req, res) => {
  // Create a new task for the specified list

  List.findOne({
    _id: req.params.listId,
    _userId: req.user_id,
  })
    .then((list) => {
      // If the authenticated user has access to the list provided, return true
      // else, return false - the user object is undefined
      return list ? true : false;
    })
    .then((canCreateTask) => {
      if (canCreateTask) {
        let newTask = new Task({
          title: req.body.title,
          _listId: req.params.listId,
        });
        newTask.save().then((newTaskDoc) => {
          res.send(newTaskDoc);
        });
      } else {
        // Send 404 - List ID could not be found
        res.sendStatus(404);
      }
    });
});

/**
 * PATCH /lists/:listId/tasks/:taskId
 * Purpose: updates a task
 */

app.patch("/lists/:listId/tasks/:taskId", authenticate, (req, res) => {
  // Update a specified task

  List.findOne({
    _id: req.params.listId,
    _userId: req.user_id,
  })
    .then((list) => {
      return list ? true : false;
    })
    .then((canUpdateTasks) => {
      if (canUpdateTasks) {
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
      } else {
        res.sendStatus(404);
      }
    });
});

/**
 * DELETE /lists/:listId/tasks/:taskId
 * Purpose: delete a given task
 */

app.delete("/lists/:listId/tasks/:taskId", authenticate, (req, res) => {
  List.findOne({
    _id: req.params.listId,
    _userId: req.user_id,
  })
    .then((list) => {
      return list ? true : false;
    })
    .then((canUpdateTasks) => {
      if (canUpdateTasks) {
        Task.findOneAndRemove({
          _id: req.params.taskId,
          _listId: req.params.listId,
        }).then((removedTaskDoc) => {
          res.send(removedTaskDoc);
        });
      } else {
        res.sendStatus(404);
      }
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
  let email = req.body.email;
  let password = req.body.password;

  User.findByCredentials(email, password)
    .then((user) => {
      return user
        .createSession()
        .then((refreshToken) => {
          return user.generateAccessAuthToken().then((accessToken) => {
            return { accessToken, refreshToken };
          });
        })
        .then((authTokens) => {
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

/**
 * GET /users/me/access-token
 * Purpose: Get an access token
 */

app.get("/users/me/access-token", verifySession, (req, res) => {
  // Note: need to check that the user is allowed to access this
  // We verified that the user/caller is valid

  req.userObject
    .generateAccessAuthToken()
    .then((accessToken) => {
      // Sending access token in both header and in body
      // Allows the client to have two ways to access the token
      res.header("x-access-token", accessToken).send({ accessToken });
    })
    .catch((e) => {
      res.status(400).send(e);
    });
});

/**Helpers */

let deleteTasksFromList = (_listId) => {
  Task.deleteMany({
    _listId,
  }).then(() => {
    console.log(`All tasks from ${_listId} have been deleted`);
  });
};

// Listen on Port 3000

app.listen(3000, () => {
  console.log("Server is listening on port 3000");
});
