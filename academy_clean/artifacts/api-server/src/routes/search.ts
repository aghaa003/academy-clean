import { Router } from "express";
import { User, Course, Repository, Challenge, toDoc, toDocs } from "@workspace/db";
import { GlobalSearchQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/search", async (req, res) => {
  try {
    const query = GlobalSearchQueryParams.parse(req.query);
    const escaped = query.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const q = new RegExp(escaped, "i");
    const type = query.type ?? "all";
    const [users, courses, repositories, challenges] = await Promise.all([
      (type === "all" || type === "users")
        ? User.find({ $or: [{ name: q }, { username: q }], role: { $ne: "admin" } }).limit(5).lean()
        : [],
      (type === "all" || type === "courses")
        ? Course.find({ title: q }).limit(5).lean()
        : [],
      (type === "all" || type === "repositories")
        ? Repository.find({ $or: [{ title: q }, { description: q }] }).limit(5).lean()
        : [],
      (type === "all" || type === "challenges")
        ? Challenge.find({ title: q }).limit(5).lean()
        : [],
    ]);
    res.json({
      users: toDocs(users as any[]),
      courses: toDocs(courses as any[]),
      repositories: toDocs(repositories as any[]),
      challenges: toDocs(challenges as any[]),
    });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
