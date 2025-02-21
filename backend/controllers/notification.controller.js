import Notification from "../models/notification.model.js";

// Get notifications
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ to: req.user._id })
      .populate("from", "username profileImg")
      .sort({ createdAt: -1 });

    if (notifications.length === 0) {
      return res.status(404).send("No notifications found");
    }

    // Mark notifications as read
    await Notification.updateMany(
      { to: req.user._id, read: false },
      { read: true }
    );

    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).send("Error getting notifications");
  }
};

// Delete notifications
export const deleteNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ to: req.user._id });
    res.status(200).send("Notifications deleted successfully");
  } catch (error) {
    res.status(500).send("Error deleting notifications");
  }
};
