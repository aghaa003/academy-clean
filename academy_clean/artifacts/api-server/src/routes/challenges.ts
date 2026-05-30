import { Router } from "express";
import { Challenge, Submission, User, nextId, toDoc, toDocs } from "@workspace/db";
import { CreateChallengeBody, ListChallengesQueryParams } from "@workspace/api-zod";

const router = Router();

function getSessionUser(req: any): { id: string } | null {
  const raw = req.signedCookies?.["academy_session"];
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

const SEED_CHALLENGES = [
  { title: "Even Number Array", description: "Display all even numbers within a given range.", difficulty: "easy", category: "Algorithms", section: "algorithms", points: 10 },
  { title: "Find Largest Element", description: "Find the largest value in a numeric array.", difficulty: "easy", category: "Data Structures", section: "data-structures", points: 12 },
  { title: "Active Users Query", description: "Extract users who logged in during the last 30 days.", difficulty: "medium", category: "Databases", section: "databases", points: 18 },
  { title: "Interactive Todo List", description: "Build a Todo App with responsive UI and local state.", difficulty: "medium", category: "Web Dev", section: "web", points: 20 },
  { title: "Balanced Binary Tree", description: "Verify balance of a binary tree and count its levels.", difficulty: "hard", category: "Algorithms", section: "algorithms", points: 30 },
  { title: "Analytics Dashboard", description: "Design a dashboard with KPIs, charts, and filtering.", difficulty: "hard", category: "Web Dev", section: "web", points: 35 },
  { title: "Relational Schema Design", description: "Design linked tables with relationships and indexes.", difficulty: "medium", category: "Databases", section: "databases", points: 22 },
  { title: "Binary Search Algorithm", description: "Implement binary search with input boundary handling.", difficulty: "easy", category: "Algorithms", section: "algorithms", points: 14 },
];

async function seedChallengesIfEmpty() {
  const count = await Challenge.countDocuments();
  if (count > 0) return;
  for (const ch of SEED_CHALLENGES) {
    const id = await nextId("challenges");
    await Challenge.create({ _id: id, ...ch });
  }
}

router.get("/challenges/seed", async (req, res) => {
  try {
    await seedChallengesIfEmpty();
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/challenges", async (req, res) => {
  try {
    const query = ListChallengesQueryParams.parse(req.query);
    await seedChallengesIfEmpty();
    const filter: any = {};
    if (query.difficulty) filter.difficulty = query.difficulty;
    if (query.category) filter.category = query.category;
    const challenges = await Challenge.find(filter)
      .sort({ points: 1 })
      .limit(query.limit)
      .skip(query.offset)
      .lean();
    const total = await Challenge.countDocuments(filter);
    res.json({ challenges: toDocs(challenges), total });
  } catch (err) {
    req.log.error({ err }, "Failed to list challenges");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/challenges", async (req, res) => {
  try {
    const body = CreateChallengeBody.parse(req.body);
    const id = await nextId("challenges");
    const challenge = await Challenge.create({ _id: id, ...body });
    res.status(201).json(toDoc(challenge.toObject()));
  } catch (err) {
    req.log.error({ err }, "Failed to create challenge");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/challenges/:challengeId", async (req, res) => {
  try {
    const id = Number(req.params.challengeId);
    const challenge = await Challenge.findById(id).lean() as any;
    if (!challenge) { res.status(404).json({ error: "Challenge not found" }); return; }
    res.json(toDoc(challenge));
  } catch (err) {
    req.log.error({ err }, "Failed to get challenge");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/challenges/:challengeId/submit", async (req, res) => {
  const s = getSessionUser(req);
  if (!s) { res.status(401).json({ error: "Not authenticated" }); return; }
  try {
    const challengeId = Number(req.params.challengeId);
    const { solution, language, score, isCorrect } = req.body as {
      solution?: string; language?: string; score?: number; isCorrect?: boolean;
    };

    if (!solution?.trim()) {
      res.status(400).json({ error: "Solution is required" }); return;
    }

    const challenge = await Challenge.findById(challengeId).lean() as any;
    if (!challenge) { res.status(404).json({ error: "Challenge not found" }); return; }

    const lu = await User.findOne({ clerkId: s.id }).lean() as any;
    if (!lu) { res.status(404).json({ error: "User not found" }); return; }

    const userId = String(lu._id);
    const success = isCorrect ?? false;
    const submissionScore = score ?? 0;
    const pointsEarned = success ? challenge.points : 0;

    const existingSuccessful = success
      ? await Submission.findOne({ challengeId, userId, success: true }).lean()
      : null;

    const subId = await nextId("submissions");
    await Submission.create({
      _id: subId, challengeId, userId,
      solution: solution.trim(),
      language: language ?? "unknown",
      success, pointsEarned,
      score: submissionScore,
    });

    await Challenge.findByIdAndUpdate(challengeId, { $inc: { totalSubmissions: 1 } });

    if (success && !existingSuccessful) {
      await User.findByIdAndUpdate(userId, { $inc: { points: pointsEarned } });

      const totalSubs = await Submission.countDocuments({ challengeId });
      const successSubs = await Submission.countDocuments({ challengeId, success: true });
      const successRate = totalSubs > 0 ? successSubs / totalSubs : 0;
      await Challenge.findByIdAndUpdate(challengeId, { successRate });
    }

    const updatedUser = await User.findById(userId).lean() as any;
    res.json({
      success,
      pointsEarned: success && !existingSuccessful ? pointsEarned : 0,
      alreadySolved: success && !!existingSuccessful,
      totalPoints: updatedUser?.points ?? 0,
      message: success
        ? existingSuccessful
          ? "لقد حللت هذا التحدي مسبقاً — لا تضاف نقاط مكررة."
          : `أحسنت! حصلت على ${pointsEarned} نقطة`
        : "الحل يحتاج إلى مراجعة وتحسين.",
    });
  } catch (err) {
    req.log.error({ err }, "Failed to submit");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
