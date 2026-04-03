import express from "express";
import { isAuth, isAdmin } from "../middleware/isAuth.js";
import { getAllUsers } from "../controller/user.js";
import { getAdminStats, getAllTransactions } from "../controller/admin.js";

const router = express.Router();

router.get("/users", isAuth, isAdmin, getAllUsers);

router.get("/stats", isAuth, isAdmin, getAdminStats);

router.get("/transactions", isAuth, isAdmin, getAllTransactions);

export default router;