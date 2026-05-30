import { Router, type IRouter } from "express";

import healthRouter from "./health";
import usersRouter from "./users";
import coursesRouter from "./courses";
import repositoriesRouter from "./repositories";
import challengesRouter from "./challenges";
import searchRouter from "./search";
import statsRouter from "./stats";
import authRouter from "./auth";
import adminRouter from "./admin";
import uploadRouter from "./upload";
import lessonsRouter from "./lessons";
import communityRouter from "./community";
import assignmentsRouter from "./assignments";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

/**
 * System Routes
 */
router.use(healthRouter);
router.use(authRouter);
router.use(adminRouter);

/**
 * Upload Routes
 * All upload endpoints start with /upload
 */
router.use("/upload", uploadRouter);

/**
 * Application Routes
 */
router.use(usersRouter);
router.use(coursesRouter);
router.use(repositoriesRouter);
router.use(challengesRouter);
router.use(searchRouter);
router.use(statsRouter);
router.use(lessonsRouter);
router.use(communityRouter);
router.use(assignmentsRouter);
router.use(notificationsRouter);

export default router;
