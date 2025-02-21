import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";
import bcrypt from "bcrypt";
import { v2 as cloudinary } from "cloudinary";

// Get user profile by username
export const getUserProfile = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username }).select("-password");
    if (!user) {
      return res.status(404).send("User not found");
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).send("Error getting user profile");
  }
};

// Get suggested users
export const getSuggestedUsers = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("following");
    const followingIds = user.following;

    const users = await User.find({
      _id: { $nin: [...followingIds, req.user._id] },
    })
      .select("-password")
      .limit(10); // Example: limit to 10 suggested users

    res.status(200).json(users);
  } catch (error) {
    res.status(500).send("Error getting suggested users");
  }
};

// Follow or unfollow a user
export const followUnfollowUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user._id);
    const targetUser = await User.findById(id);

    if (!targetUser) {
      return res.status(404).send("User not found");
    }

    // Ensure the user cannot follow themselves
    if (user._id.equals(targetUser._id)) {
      return res.status(400).send("You cannot follow yourself");
    }

    const isFollowing = user.following.includes(id);

    if (isFollowing) {
      user.following.pull(id);
      targetUser.followers.pull(user._id);
    } else {
      user.following.push(id);
      targetUser.followers.push(user._id);

      // Create a notification for the follow action
      const notification = new Notification({
        from: user._id,
        to: targetUser._id,
        type: "follow",
      });
      await notification.save();
    }

    await user.save();
    await targetUser.save();

    res.status(200).send("Follow/unfollow successful");
  } catch (error) {
    console.log(error);
    res.status(500).send("Error following/unfollowing user");
  }
};

export const updateUser = async (req, res) => {
  try {
    const {
      username,
      email,
      currentPassword,
      newPassword,
      fullName,
      profileImg,
      coverImg,
      bio,
      link,
    } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).send("User not found");
    }

    if (currentPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).send("Current password is incorrect");
      }
    }

    // Update user details
    user.username = username || user.username;
    user.email = email || user.email;
    user.fullName = fullName || user.fullName;
    user.bio = bio || user.bio;
    user.link = link || user.link;

    // Upload profile image to Cloudinary if provided
    if (profileImg) {
      // Destroy old profile image if it exists
      if (user.profileImg) {
        const publicId = user.profileImg.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`profile_images/${publicId}`);
      }
      const result = await cloudinary.uploader.upload(profileImg, {
        folder: "profile_images",
      });
      user.profileImg = result.secure_url;
    }

    // Upload cover image to Cloudinary if provided
    if (coverImg) {
      // Destroy old cover image if it exists
      if (user.coverImg) {
        const publicId = user.coverImg.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`cover_images/${publicId}`);
      }
      const result = await cloudinary.uploader.upload(coverImg, {
        folder: "cover_images",
      });
      user.coverImg = result.secure_url;
    }

    // Update password if new password is provided
    if (newPassword) {
      if (newPassword.length < 8) {
        return res
          .status(400)
          .send("New password must be at least 8 characters long");
      }
      user.password = await bcrypt.hash(newPassword, 10);
    }

    await user.save();

    // Exclude password from the response
    const { password, ...userWithoutPassword } = user.toObject();

    res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.log(error);
    res.status(500).send("Error updating user profile");
  }
};
