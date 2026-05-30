import { Router } from "express";
import { Notification, toDoc, toDocs } from "@workspace/db";

const router = Router();

function getSessionUser(req: any): { id: string } | null {
  const raw = req.signedCookies?.["academy_session"];
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

router.get("/notifications", async (req, res) => {
  const s = getSessionUser(req);
  if (!s) { res.status(401).json({ error: "Not authenticated" }); return; }
  try {
    const { User } = await import("@workspace/db");
    const lu = await User.findOne({ $or: [{ _id: s.id }, { clerkId: s.id }] }).lean() as any;
    if (!lu) { res.status(404).json({ error: "User not found" }); return; }
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const notifications = await Notification.find({ userId: String(lu._id) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    const unreadCount = await Notification.countDocuments({ userId: String(lu._id), read: false });
    res.json({ notifications: toDocs(notifications), unreadCount });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/notifications/read-all", async (req, res) => {
  const s = getSessionUser(req);
  if (!s) { res.status(401).json({ error: "Not authenticated" }); return; }
  try {
    const { User } = await import("@workspace/db");
    const lu = await User.findOne({ $or: [{ _id: s.id }, { clerkId: s.id }] }).lean() as any;
    if (!lu) { res.status(404).json({ error: "User not found" }); return; }
    await Notification.updateMany({ userId: String(lu._id), read: false }, { read: true });
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/notifications/:notificationId/read", async (req, res) => {
  const s = getSessionUser(req);
  if (!s) { res.status(401).json({ error: "Not authenticated" }); return; }
  try {
    const { User } = await import("@workspace/db");
    const lu = await User.findOne({ $or: [{ _id: s.id }, { clerkId: s.id }] }).lean() as any;
    if (!lu) { res.status(404).json({ error: "User not found" }); return; }
    const id = Number(req.params.notificationId);
    await Notification.findOneAndUpdate({ _id: id, userId: String(lu._id) }, { read: true });
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
