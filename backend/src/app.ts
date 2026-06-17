import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import { healthRouter } from "./modules/health/health.route";
import { errorMiddleware, CustomError } from "./middlewares/error.middleware";

const app: Application = express();

app.use(cors());
app.use(express.json());

app.use("/api/v1/health", healthRouter);

app.use((req: Request, res: Response, next: NextFunction) => {
  const error: CustomError = new Error(`Cannot ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

app.use(errorMiddleware);

export default app;
