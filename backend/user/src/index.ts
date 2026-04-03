import express from "express";
import dotenv from "dotenv";
import connectDb from "./config/db.js";
import { createClient } from "redis";
import userRoutes from "./routes/user.js";
import { connectRabbitMQ } from "./config/rabbitmq.js";
import cors from "cors";
import adminRoutes from "./routes/admin.js";

dotenv.config();

connectDb();
connectRabbitMQ();

export const redisClient = createClient({
    url: process.env.REDIS_URL,
    socket: process.env.REDIS_URL?.startsWith("rediss://")
        ? {
              tls: true,
              rejectUnauthorized: false,
          }
        : undefined,
});

redisClient.on("error", (err) => {
    console.error("Redis Error:", err);
});

redisClient
    .connect()
    .then(() => console.log("Redis Connected"))
    .catch((err) => console.error("Redis Connection Failed:", err));

const app = express();
app.use("/api/admin", adminRoutes);

app.use(
    cors({
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        credentials: true,
    })
);

app.use(express.json());

app.use("/api/v1/", userRoutes);

const port = process.env.PORT || 5000;

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});