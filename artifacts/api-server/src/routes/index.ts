import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import alertsRouter from "./alerts";
import authRouter from "./auth";
import adminRouter from "./admin";
import broadcastsRouter from "./broadcasts";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/admin", adminRouter);
router.use("/users", usersRouter);
router.use("/alerts", alertsRouter);
router.use(broadcastsRouter);

export default router;
