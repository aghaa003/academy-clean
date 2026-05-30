import { Router } from "express";
import {
  CommunityPost, CommunityPostLike, CommunityPostComment,
  User, Notification, nextId, toDoc,
} from "@workspace/db";

const router = Router();

function getSessionUser(req: any): { id: string } | null {
  const raw = req.signedCookies?.["academy_session"];
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

async function getLocalUser(clerkId: string): Promise<any> {
  return (await User.findOne({ clerkId }).lean()) ?? null;
}

async function createNotification(opts: {
  userId: string; fromUserId: string; fromUserName: string;
  type: string; entityId?: number; entityTitle?: string; message: string;
}) {
  try {
    if (opts.userId === opts.fromUserId) return;
    const existing = await Notification.findOne({
      userId: opts.userId, fromUserId: opts.fromUserId,
      type: opts.type, entityId: opts.entityId ?? null,
    }).lean();
    if (existing) return;
    const id = await nextId("notifications");
    await Notification.create({
      _id: id, ...opts,
      entityId: opts.entityId ?? null,
      entityTitle: opts.entityTitle ?? "",
    });
  } catch { /* non-critical */ }
}

router.get("/community/posts", async (req, res) => {
  try {
    const s = getSessionUser(req);
    const rows = await CommunityPost.find().sort({ createdAt: -1 }).limit(50).lean() as any[];
    const enriched = await Promise.all(
      rows.map(async (p) => {
        const author = await User.findById(p.userId).lean() as any;
        let liked = false;
        if (s) {
          const lu = await getLocalUser(s.id);
          if (lu) liked = !!(await CommunityPostLike.findOne({ postId: p._id, userId: lu._id }).lean());
        }
        return { ...toDoc(p), authorName: author?.name ?? "User", authorAvatar: author?.avatarUrl ?? null, liked };
      })
    );
    res.json(enriched);
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/community/posts", async (req, res) => {
  const s = getSessionUser(req);
  if (!s) { res.status(401).json({ error: "Not authenticated" }); return; }
  try {
    const { title, body, tags } = req.body as { title?: string; body?: string; tags?: string[] };
    if (!title?.trim() || !body?.trim()) {
      res.status(400).json({ error: "Title and body are required" }); return;
    }
    const lu = await getLocalUser(s.id);
    if (!lu) { res.status(404).json({ error: "User not found" }); return; }
    const post = await CommunityPost.create({
      _id: await nextId("communityPosts"),
      userId: lu._id,
      title: title.trim(),
      body: body.trim(),
      tags: (tags ?? []).filter(Boolean),
    });
    res.status(201).json({
      ...toDoc(post.toObject()),
      authorName: lu.name,
      authorAvatar: lu.avatarUrl ?? null,
      liked: false,
    });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/community/posts/:postId/like", async (req, res) => {
  const s = getSessionUser(req);
  if (!s) { res.status(401).json({ error: "Not authenticated" }); return; }
  try {
    const postId = Number(req.params.postId);
    const lu = await getLocalUser(s.id);
    if (!lu) { res.status(404).json({ error: "User not found" }); return; }
    const existing = await CommunityPostLike.findOne({ postId, userId: lu._id }).lean() as any;
    if (existing) {
      await CommunityPostLike.findByIdAndDelete(existing._id);
      await CommunityPost.findByIdAndUpdate(postId, { $inc: { likesCount: -1 } });
      const p = await CommunityPost.findById(postId).lean() as any;
      res.json({ liked: false, likesCount: p?.likesCount ?? 0 }); return;
    }
    await CommunityPostLike.create({ _id: await nextId("communityPostLikes"), postId, userId: lu._id });
    await CommunityPost.findByIdAndUpdate(postId, { $inc: { likesCount: 1 } });
    const p = await CommunityPost.findById(postId).lean() as any;

    if (p) {
      const postOwner = await User.findById(p.userId).lean() as any;
      if (postOwner) {
        await createNotification({
          userId: String(p.userId),
          fromUserId: String(lu._id),
          fromUserName: lu.name,
          type: "post_like",
          entityId: postId,
          entityTitle: p.title,
          message: `${lu.name} أعجب بمشاركتك "${p.title}"`,
        });
      }
    }

    res.json({ liked: true, likesCount: p?.likesCount ?? 0 });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/community/posts/:postId/comments", async (req, res) => {
  try {
    const postId = Number(req.params.postId);
    const rows = await CommunityPostComment.find({ postId }).sort({ createdAt: 1 }).lean() as any[];
    const enriched = await Promise.all(
      rows.map(async (c) => {
        const a = await User.findById(c.userId).lean() as any;
        return { ...toDoc(c), authorName: a?.name ?? "User", authorAvatar: a?.avatarUrl ?? null };
      })
    );
    res.json(enriched);
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/community/posts/:postId/comments", async (req, res) => {
  const s = getSessionUser(req);
  if (!s) { res.status(401).json({ error: "Not authenticated" }); return; }
  try {
    const postId = Number(req.params.postId);
    const { content, parentId } = req.body as { content?: string; parentId?: number };
    if (!content?.trim()) { res.status(400).json({ error: "Comment is empty" }); return; }
    const lu = await getLocalUser(s.id);
    if (!lu) { res.status(404).json({ error: "User not found" }); return; }
    const comment = await CommunityPostComment.create({
      _id: await nextId("communityPostComments"),
      postId, userId: lu._id, parentId: parentId ?? null, content: content.trim(),
    });
    await CommunityPost.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });

    const p = await CommunityPost.findById(postId).lean() as any;
    if (p) {
      await createNotification({
        userId: String(p.userId),
        fromUserId: String(lu._id),
        fromUserName: lu.name,
        type: "post_comment",
        entityId: postId,
        entityTitle: p.title,
        message: `${lu.name} علّق على مشاركتك "${p.title}"`,
      });
    }

    res.status(201).json({
      ...toDoc(comment.toObject()),
      authorName: lu.name,
      authorAvatar: lu.avatarUrl ?? null,
    });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/community/posts/:postId/comments/:commentId", async (req, res) => {
  const s = getSessionUser(req);
  if (!s) { res.status(401).json({ error: "Not authenticated" }); return; }
  try {
    const commentId = Number(req.params.commentId);
    const postId = Number(req.params.postId);
    const lu = await getLocalUser(s.id);
    if (!lu) { res.status(404).json({ error: "User not found" }); return; }
    const comment = await CommunityPostComment.findById(commentId).lean() as any;
    if (!comment) { res.status(404).json({ error: "Comment not found" }); return; }
    const isOwner = String(comment.userId) === String(lu._id);
    if (!isOwner && lu.role !== "admin") {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    await CommunityPostComment.findByIdAndDelete(commentId);
    await CommunityPost.findByIdAndUpdate(postId, { $inc: { commentsCount: -1 } });
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
