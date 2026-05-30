import { Router } from "express";
import { User, Course, Repository, Challenge, Submission } from "@workspace/db";

const router = Router();

router.get("/stats/platform", async (req, res) => {
  try {
    const [totalUsers, totalCourses, totalRepos, totalChallenges, totalSolved] = await Promise.all([
      User.countDocuments({ role: { $ne: "admin" } }),
      Course.countDocuments(),
      Repository.countDocuments({ isDraft: { $ne: true } }),
      Challenge.countDocuments(),
      Submission.countDocuments({ success: true }),
    ]);
    res.json({
      totalUsers,
      totalCourses,
      totalRepositories: totalRepos,
      totalChallenges,
      totalChallengesSolved: totalSolved,
    });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/stats/user/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findOne({
      $or: [{ _id: userId }, { clerkId: userId }],
    }).lean() as any;

    if (!user) {
      res.json({
        userId,
        solvedChallenges: 0,
        totalPoints: 0,
        globalRank: 0,
        coursesEnrolled: 0,
        repositoriesCreated: 0,
        categoriesBreakdown: [],
        points: 0,
        coursesCompleted: 0,
        challengesSolved: 0,
        totalSubmissions: 0,
      });
      return;
    }

    const actualId = user._id as string;
    const [solvedCount, repoCount, courseCount, totalSubs] = await Promise.all([
      Submission.countDocuments({ userId: actualId, success: true }),
      Repository.countDocuments({ userId: actualId }),
      Course.countDocuments({ creatorId: actualId }),
      Submission.countDocuments({ userId: actualId }),
    ]);

    const allUsersAbove = await User.countDocuments({
      role: { $ne: "admin" },
      points: { $gt: user.points ?? 0 },
    });
    const globalRank = allUsersAbove + 1;

    res.json({
      userId,
      solvedChallenges: solvedCount,
      totalPoints: user.points ?? 0,
      globalRank,
      coursesEnrolled: courseCount,
      repositoriesCreated: repoCount,
      categoriesBreakdown: [],
      points: user.points ?? 0,
      coursesCompleted: courseCount,
      challengesSolved: solvedCount,
      totalSubmissions: totalSubs,
    });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
