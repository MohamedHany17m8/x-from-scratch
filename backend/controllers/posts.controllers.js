import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import { v2 as cloudinary } from "cloudinary";
import Notification from "../models/notification.model.js";

// Get all posts
export const getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("user", "username profileImg fullName")
      .populate("comments.user", "username profileImg fullName")
      .sort({ createdAt: -1 });
    if (posts.length === 0) {
      return res.status(404).json({ error: "No posts found" });
    }
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ error: "Error getting posts" });
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
      .populate("user", "username profileImg fullName")
      .populate("comments.user", "username profileImg fullName");

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
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json(user.likedPosts);
  } catch (error) {
    res.status(500).json({ error: "Error getting liked posts" });
  }
};

// Get user posts by username
export const getUserPosts = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username }).select("_id");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const posts = await Post.find({ user: user._id })
      .populate("user", "username profileImg fullName")
      .populate("comments.user", "username profileImg fullName")
      .sort({ createdAt: -1 });
    if (posts.length === 0) {
      return res.status(404).json({ error: "No posts found" });
    }
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ error: "Error getting posts" });
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
    res.status(500).json({ error: "Error creating post" });
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
      return res.status(404).json({ error: "Post not found" });
    }

    const user = await User.findById(req.user._id);
    const isLiked = post.likes.includes(req.user._id);

    if (isLiked) {
      post.likes.pull(req.user._id);
      user.likedPosts.pull(post._id);
      await post.save();
      await user.save();
      return res.status(200).json({ message: "Post unliked successfully" });
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

      return res.status(200).json({ message: "Post liked successfully" });
    }
  } catch (error) {
    res.status(500).json({ error: "Error liking/unliking post" });
  }
};

// Comment on a post
export const commentOnPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const comment = {
      text,
      user: req.user._id,
    };

    post.comments.push(comment);
    await post.save();

    // Fetch the updated post with populated fields
    const updatedPost = await Post.findById(id)
      .populate("user", "username profileImg fullName")
      .populate("comments.user", "username profileImg fullName");

    res.status(201).json(updatedPost);
  } catch (error) {
    res.status(500).json({ error: "Error commenting on post" });
  }
};

// Delete a post
export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        error: "You are not authorized to delete this post",
      });
    }

    if (post.img) {
      // Extract public_id from Cloudinary URL
      // URL format: https://res.cloudinary.com/your-cloud-name/image/upload/v1234567890/folder_name/image_public_id.jpg
      const publicId = post.img
        .split("/")
        .slice(-2) // Get the last two segments (folder and filename)
        .join("/") // Join them back with "/"
        .split(".")[0]; // Remove the file extension

      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (cloudinaryError) {
        console.log("Error deleting image from Cloudinary:", cloudinaryError);
        // Continue with post deletion even if image deletion fails
      }
    }

    await Post.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    console.log("Error in deletePost controller: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
