const mongoose = require("mongoose");

mongoose
  .connect(
    "mongodb+srv://" +
      process.env.DB_USER_PASS +
      "@twit-like-faustin.i23wy7n.mongodb.net/twitter-like"
  )
  .then(() => console.log("co à Mongoose"))
  .catch((err) => console.log("Pas réussi à se co", err));
