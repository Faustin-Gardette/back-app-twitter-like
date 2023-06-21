const PostModel = require("../models/post.model");
const postModel = require("../models/post.model");
const UserModel = require("../models/user.model");
const { uploadErrors } = require("../utils/errors.utils");
const ObjectID = require("mongoose").Types.ObjectId;
const fs = require("fs");
const { promisify } = require("util");
const pipeline = promisify(require("stream").pipeline);

module.exports.readPost = async (req, res) => {
  try {
    const posts = await PostModel.find().sort({ createdAt: -1 });
    res.send(posts);
  } catch (err) {
    console.log("Error to get data: " + err);
    res.status(500).send("Internal Server Error");
  }
};

module.exports.createPost = async (req, res) => {
  let fileName;

  if (req.file !== null) {
    try {
      if (
        req.file.detectedMimeType != "image/jpg" &&
        req.file.detectedMimeType != "image/png" &&
        req.file.detectedMimeType != "image/jpeg"
      )
        throw Error("invalid file");

      if (req.file.size > 500000) throw Error("max size");
    } catch (err) {
      const errors = uploadErrors(err);
      return res.status(201).json({ errors });
    }

    fileName = req.body.posterId + Date.now() + ".jpg";

    await pipeline(
      req.file.stream,
      fs.createWriteStream(
        `${__dirname}/../client/public/uploads/posts/${fileName}`
      )
    );
  }

  const newPost = new postModel({
    posterId: req.body.posterId,
    message: req.body.message,
    picture: req.file !== null ? "./uploads/posts/" + fileName : "",
    video: req.body.video,
    likers: [],
    comments: [],
  });

  try {
    const post = await newPost.save();
    return res.status(201).json(post);
  } catch (err) {
    return res.status(400).send(err);
  }
};

module.exports.updatePost = (req, res) => {
  if (!ObjectID.isValid(req.params.id))
    return res.status(400).send("ID unknown : " + req.params.id);

  const updatedRecord = {
    message: req.body.message,
  };

  PostModel.findByIdAndUpdate(
    req.params.id,
    { $set: updatedRecord },
    { new: true },
    (err, docs) => {
      if (!err) res.send(docs);
      else console.log("Update error : " + err);
    }
  );
};

module.exports.deletePost = async (req, res) => {
  if (!ObjectID.isValid(req.params.id))
    return res.status(400).send("ID inconnu :" + req.params.id);

  try {
    const deletedPost = await PostModel.findByIdAndRemove(req.params.id);
    res.send(deletedPost);
  } catch (err) {
    console.log("Delete error: " + err);
    res.status(500).send("Internal Server Error");
  }
};

module.exports.likePost = async (req, res) => {
  if (!ObjectID.isValid(req.params.id))
    return res.status(400).send("ID inconnu :" + req.params.id);

  try {
    await PostModel.findByIdAndUpdate(req.params.id, {
      $addToSet: { likers: req.body.id },
    }).exec();

    const user = await UserModel.findByIdAndUpdate(
      req.body.id,
      {
        $addToSet: { likes: req.params.id },
      },
      { new: true }
    ).exec();

    res.send(user);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Internal Server Error");
  }
};

module.exports.unlikePost = async (req, res) => {
  if (!ObjectID.isValid(req.params.id))
    return res.status(400).send("ID inconnu :" + req.params.id);

  try {
    await PostModel.findByIdAndUpdate(req.params.id, {
      $pull: { likers: req.body.id },
    }).exec();

    const user = await UserModel.findByIdAndUpdate(
      req.body.id,
      {
        $pull: { likes: req.params.id },
      },
      { new: true }
    ).exec();

    res.send(user);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Internal Server Error");
  }
};

module.exports.commentPost = async (req, res) => {
  if (!ObjectID.isValid(req.params.id))
    return res.status(400).send("ID inconnu :" + req.params.id);

  try {
    const updatedPost = await PostModel.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          comments: {
            commenterId: req.body.commenterId,
            commenterPseudo: req.body.commenterPseudo,
            text: req.body.text,
            timestamps: new Date().getTime(),
          },
        },
      },
      { new: true }
    );

    if (updatedPost) {
      return res.send(updatedPost);
    } else {
      return res.status(404).send("Post introuvable");
    }
  } catch (err) {
    return res.status(400).send(err);
  }
};

module.exports.editCommentPost = async (req, res) => {
  if (!ObjectID.isValid(req.params.id))
    return res.status(400).send("ID inconnu :" + req.params.id);

  try {
    const post = await PostModel.findById(req.params.id);
    if (!post) return res.status(404).send("Post not found");

    const comment = post.comments.find((comment) =>
      comment._id.equals(req.body.commentId)
    );
    if (!comment) return res.status(404).send("Comment not found");

    comment.text = req.body.text;

    await post.save();

    return res.status(200).send(post);
  } catch (err) {
    return res.status(500).send(err);
  }
};

module.exports.deleteCommentPost = async (req, res) => {
  if (!ObjectID.isValid(req.params.id))
    return res.status(400).send("ID inconnu :" + req.params.id);

  try {
    const post = await PostModel.findById(req.params.id);
    if (!post) return res.status(404).send("Post not found");

    const commentIndex = post.comments.findIndex(
      (comment) => comment._id.toString() === req.body.commentId
    );
    if (commentIndex === -1) return res.status(404).send("Comment not found");

    post.comments.splice(commentIndex, 1);

    const updatedPost = await post.save();

    return res.status(200).send(updatedPost);
  } catch (err) {
    return res.status(500).send(err);
  }
};
