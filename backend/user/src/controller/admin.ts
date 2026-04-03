import TryCatch from "../config/TryCatch.js";
import { User } from "../model/User.js";
import { Transaction } from "../model/Transaction.js";

export const getAdminStats = TryCatch(async (req, res) => {
  const totalUsers = await User.countDocuments();

  const totalTransactions = await Transaction.countDocuments();

  res.json({
    totalUsers,
    totalTransactions,
  });
});

export const getAllTransactions = TryCatch(async (req, res) => {
  const transactions = await Transaction.find().sort({ createdAt: -1 });

  res.json(transactions);
});