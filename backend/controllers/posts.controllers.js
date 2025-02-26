import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import { v2 as cloudinary } from "cloudinary";
import Notification from "../models/notification.model.js";

// Get all posts
export const getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("user", "username profileImg")
      .sort({ createdAt: -1 });
    if (posts.length === 0) {
      return res.status(404).send("No posts found");
    }
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).send("Error getting posts");
  }
};

// Get posts from followed users
export const getFollowingPosts = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const following = user.following;

    const feedPosts = await Post.find({ user: { $in: following } })
      .sort({ createdAt: -1 })
      .populate({
        path: "user",
        select: "-password",
      })
      .populate({
        path: "comments.user",
        select: "-password",
      });

    res.status(200).json(feedPosts);
  } catch (error) {
    console.log("Error in getFollowingPosts controller: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get liked posts
export const getLikedPosts = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("likedPosts");
    if (!user) {
      return res.status(404).send("User not found");
    }
    res.status(200).json(user.likedPosts);
  } catch (error) {
    res.status(500).send("Error getting liked posts");
  }
};

// Get user posts by username
export const getUserPosts = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username }).select("_id");
    if (!user) {
      return res.status(404).send("User not found");
    }

    const posts = await Post.find({ user: user._id })
      .populate("user", "username profileImg")
      .sort({ createdAt: -1 });
    if (posts.length === 0) {
      return res.status(404).send("No posts found");
    }
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).send("Error getting posts");
  }
};

// Create a post
export const createPost = async (req, res) => {
  try {
    const { text, img } = req.body;
    const newPost = new Post({
      user: req.user._id,
      text,
      img,
    });

    if (img) {
      const result = await cloudinary.uploader.upload(img, {
        folder: "post_images",
      });
      newPost.img = result.secure_url;
    }

    await newPost.save();
    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).send("Error creating post");
  }
};

// Like or unlike a post
export const likeUnlikePost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id).populate(
      "user",
      "username profileImg"
    );
    if (!post) {
      return res.status(404).send("Post not found");
    }

    const user = await User.findById(req.user._id);
    const isLiked = post.likes.includes(req.user._id);

    if (isLiked) {
      post.likes.pull(req.user._id);
      user.likedPosts.pull(post._id);
      await post.save();
      await user.save();
      return res.status(200).send("Post unliked successfully");
    } else {
      post.likes.push(req.user._id);
      user.likedPosts.push(post._id);
      await post.save();
      await user.save();

      // Create a notification for the like action
      const notification = new Notification({
        from: req.user._id,
        to: post.user._id,
        type: "like",
      });
      await notification.save();

      return res.status(200).send("Post liked successfully");
    }
  } catch (error) {
    res.status(500).send("Error liking/unliking post");
  }
};

// Comment on a post
export const commentOnPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).send("Post not found");
    }

    const comment = {
      text,
      user: req.user._id,
    };

    post.comments.push(comment);
    await post.save();
    res.status(201).json(post);
  } catch (error) {
    res.status(500).send("Error commenting on post");
  }
};

// Delete a post
export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).send("Post not found");
    }

    // Check if the user is the owner of the post
    if (!post.user.equals(req.user._id)) {
      return res.status(403).send("You are not authorized to delete this post");
    }

    // Destroy the image in Cloudinary if it exists
    if (post.img) {
      const publicId = post.img.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(`post_images/${publicId}`);
    }

    // Delete the post from MongoDB
    await Post.findByIdAndDelete(id);
    res.status(200).send("Post deleted successfully");
  } catch (error) {
    console.log(error);
    res.status(500).send("Error deleting post");
  }
};
