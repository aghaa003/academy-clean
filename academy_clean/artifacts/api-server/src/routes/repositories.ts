import { Router } from "express";
import { z } from "zod";
import { Repository, RepoLike, User, nextId, toDoc } from "@workspace/db";

const router = Router();

const CreateRepoSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  technologies: z.array(z.string()).default([]),
  repoUrl: z.string().nullable().optional(),
  liveDemoUrl: z.string().nullable().optional(),
  codeFilesUrls: z.array(z.string()).default([]),
  pdfFilesUrls: z.array(z.string()).default([]),
  coverImageUrl: z.string().nullable().optional(),
  userId: z.string(),
  isPublic: z.boolean().default(true),
  isDraft: z.boolean().default(false),
  sourceProject: z.string().optional(),
});

const ListReposSchema = z.object({
  userId: z.string().optional(),
  limit: z.coerce.number().default(20),
  offset: z.coerce.number().default(0),
});

const LikeSchema = z.object({
  userId: z.string(),
  action: z.enum(["like", "unlike"]),
});

async function enrichRepo(repo: any) {
  const owner = await User.findById(repo.userId).lean() as any;
  return {
    ...toDoc(repo),
    ownerName: owner?.name ?? "Unknown",
    ownerAvatar: owner?.avatarUrl ?? null,
  };
}

router.get("/repositories", async (req, res) => {
  try {
    const query = ListReposSchema.parse(req.query);

    // Determine if requester owns the requested userId
    const raw = (req as any).signedCookies?.["academy_session"];
    let requesterId: string | null = null;
    if (raw) {
      try {
        const s = JSON.parse(raw);
        const lu = await User.findOne({ clerkId: s.id }).lean() as any;
        if (lu) requesterId = String(lu._id);
      } catch { /* ignore */ }
    }

    let filter: any;
    if (query.userId) {
      const isOwner = requesterId === query.userId;
      filter = isOwner
        ? { userId: query.userId }
        : { userId: query.userId, isPublic: true, isDraft: { $ne: true } };
    } else {
      filter = { isPublic: true, isDraft: { $ne: true } };
    }

    const rows = await Repository.find(filter)
      .sort({ createdAt: -1 })
      .limit(query.limit)
      .skip(query.offset)
      .lean();
    const total = await Repository.countDocuments(filter);
    res.json({ repositories: await Promise.all(rows.map(enrichRepo)), total });
  } catch (err) {
    req.log.error({ err }, "Failed to list repos");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/repositories", async (req, res) => {
  try {
    const body = CreateRepoSchema.parse(req.body);
    const id = await nextId("repositories");
    const repo = await Repository.create({
      _id: id,
      title: body.title,
      description: body.description,
      technologies: body.technologies,
      repoUrl: body.repoUrl ?? null,
      liveDemoUrl: body.liveDemoUrl ?? null,
      codeFilesUrls: body.codeFilesUrls,
      pdfFilesUrls: body.pdfFilesUrls,
      coverImageUrl: body.coverImageUrl ?? null,
      userId: body.userId,
      isPublic: body.isPublic,
      isDraft: body.isDraft ?? false,
      sourceProject: body.sourceProject ?? null,
      likes: 0,
    });
    res.status(201).json(await enrichRepo(repo.toObject()));
  } catch (err: any) {
    req.log.error({ err }, "Failed to create repo");
    if (err?.name === "ZodError") {
      res.status(400).json({ error: "بيانات المشروع غير صحيحة", details: err.errors });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

router.get("/repositories/featured", async (req, res) => {
  try {
    const rows = await Repository.find({ isPublic: true, isDraft: { $ne: true } })
      .sort({ likes: -1 })
      .limit(6)
      .lean();
    res.json(await Promise.all(rows.map(enrichRepo)));
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/repositories/:repoId", async (req, res) => {
  try {
    const repo = await Repository.findById(Number(req.params.repoId)).lean() as any;
    if (!repo) { res.status(404).json({ error: "Repository not found" }); return; }
    res.json(await enrichRepo(repo));
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/repositories/:repoId", async (req, res) => {
  try {
    const repoId = Number(req.params.repoId);
    await Repository.findByIdAndDelete(repoId);
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/repositories/:repoId/like", async (req, res) => {
  try {
    const repoId = Number(req.params.repoId);
    const body = LikeSchema.parse(req.body);
    const existing = await RepoLike.findOne({ repositoryId: repoId, userId: body.userId }).lean() as any;
    if (body.action === "like" && !existing) {
      await RepoLike.create({ _id: await nextId("repoLikes"), repositoryId: repoId, userId: body.userId });
      await Repository.findByIdAndUpdate(repoId, { $inc: { likes: 1 } });
    } else if (body.action === "unlike" && existing) {
      await RepoLike.findByIdAndDelete(existing._id);
      await Repository.findByIdAndUpdate(repoId, { $inc: { likes: -1 } });
    }
    const repo = await Repository.findById(repoId).lean() as any;
    res.json({ liked: body.action === "like", likesCount: repo?.likes ?? 0 });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
