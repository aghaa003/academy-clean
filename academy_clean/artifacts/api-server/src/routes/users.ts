import { Router } from "express";
import { User, Submission, Repository, Course, toDoc, toDocs } from "@workspace/db";
import { CreateUserBody, UpdateUserBody, ListUsersQueryParams, GetLeaderboardQueryParams } from "@workspace/api-zod";
import { randomUUID } from "crypto";

const router = Router();

function getSessionUser(req: any): { id: string } | null {
  const raw = req.signedCookies?.["academy_session"];
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

router.get("/users", async (req, res) => {
  try {
    const query = ListUsersQueryParams.parse(req.query);
    const filter: any = { role: { $ne: "admin" } };
    if (query.role && query.role !== "admin") filter.role = query.role;
    const users = await User.find(filter).sort({ points: -1 }).limit(query.limit).skip(query.offset).lean();
    const total = await User.countDocuments(filter);
    res.json({ users: toDocs(users), total });
  } catch (err) {
    req.log.error({ err }, "Failed to list users");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/users", async (req, res) => {
  try {
    const body = CreateUserBody.parse(req.body);
    const existing = await User.findOne({ clerkId: body.clerkId }).lean() as any;
    if (existing) { res.json(toDoc(existing)); return; }
    const user = await User.create({ _id: randomUUID(), ...body, role: body.role || "user" });
    res.status(201).json(toDoc(user.toObject()));
  } catch (err) {
    req.log.error({ err }, "Failed to create user");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/users/leaderboard", async (req, res) => {
  try {
    const query = GetLeaderboardQueryParams.parse(req.query);
    const users = await User.find({ role: { $ne: "admin" }, points: { $gt: 0 } })
      .sort({ points: -1 })
      .limit(query.limit)
      .lean();
    const entries = await Promise.all(
      (users as any[]).map(async (u, i) => {
        const solvedChallenges = await Submission.countDocuments({ userId: u._id, success: true });
        return {
          rank: i + 1,
          user: toDoc(u),
          points: u.points,
          solvedChallenges,
        };
      })
    );
    res.json(entries);
  } catch (err) {
    req.log.error({ err }, "Failed to get leaderboard");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/users/points", async (req, res) => {
  const s = getSessionUser(req);
  if (!s) { res.status(401).json({ error: "Not authenticated" }); return; }
  try {
    const { points } = req.body as { points?: number };
    if (!points || points <= 0) {
      res.status(400).json({ error: "Invalid points value" }); return;
    }
    const lu = await User.findOne({ clerkId: s.id }).lean() as any;
    if (!lu) { res.status(404).json({ error: "User not found" }); return; }
    const updated = await User.findByIdAndUpdate(
      lu._id,
      { $inc: { points } },
      { new: true }
    ).lean() as any;
    res.json({ success: true, totalPoints: updated?.points ?? 0 });
  } catch (err) {
    req.log.error({ err }, "Failed to add points");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/users/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).lean() as any;
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    if (user.role === "admin") { res.status(403).json({ error: "Forbidden" }); return; }
    const [solvedCount, repoCount, courseCount, totalSubs] = await Promise.all([
      Submission.countDocuments({ userId: req.params.userId, success: true }),
      Repository.countDocuments({ userId: req.params.userId }),
      Course.countDocuments({ creatorId: req.params.userId }),
      Submission.countDocuments({ userId: req.params.userId }),
    ]);
    res.json({
      ...toDoc(user),
      solvedChallenges: solvedCount,
      totalCourses: courseCount,
      totalRepositories: repoCount,
      totalSubmissions: totalSubs,
      challengeCategories: [],
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get user");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/users/:userId", async (req, res) => {
  try {
    const body = UpdateUserBody.parse(req.body);
    const updateData: any = { ...body };
    const validRoles = ["user", "creator", "employer", "admin"];
    if (req.body.role && validRoles.includes(req.body.role)) updateData.role = req.body.role;
    const user = await User.findByIdAndUpdate(req.params.userId, updateData, { new: true }).lean() as any;
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json(toDoc(user));
  } catch (err) {
    req.log.error({ err }, "Failed to update user");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/users/profile", async (req, res) => {
  try {
    const raw = (req as any).signedCookies?.["academy_session"];
    if (!raw) { res.status(401).json({ error: "Not authenticated" }); return; }
    const sessionUser = JSON.parse(raw);
    const user = await User.findOne({ clerkId: sessionUser.id }).lean() as any;
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const { firstName, lastName, bio, avatarUrl } = req.body as any;
    const name = [firstName, lastName].filter(Boolean).join(" ").trim() || user.name;
    const username = sessionUser.email?.split("@")[0] ?? user.username;
    const updated = await User.findByIdAndUpdate(
      user._id,
      { name, username, avatarUrl: avatarUrl ?? user.avatarUrl, bio: bio ?? user.bio },
      { new: true }
    ).lean() as any;
    const merged = {
      ...sessionUser,
      firstName: firstName ?? sessionUser.firstName ?? null,
      lastName: lastName ?? sessionUser.lastName ?? null,
      fullName: name,
      username: updated.username,
      imageUrl: updated.avatarUrl ?? "",
      publicMetadata: { bio: updated.bio ?? null },
    };
    res.cookie("academy_session", JSON.stringify(merged), {
      httpOnly: true, signed: true, sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      secure: process.env.NODE_ENV === "production",
    });
    res.json({ success: true, user: merged, profile: { bio, avatarUrl: updated.avatarUrl ?? "" } });
  } catch (err) {
    req.log.error({ err }, "Failed to update profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
