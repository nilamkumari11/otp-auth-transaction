import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { transactionAPI } from "../services/api";

export const TransactionOTPVerification = () => {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // TransactionId stored in TransferFunds redirect
  const transactionId = location.state?.transactionId;

  const handleVerify = async (e) => {
    e.preventDefault();

    if (!otp.trim()) {
      alert("Please enter OTP");
      return;
    }

    if (!transactionId) {
      alert("Transaction ID not found. Please initiate a new transaction.");
      navigate("/transfer");
      return;
    }

    setLoading(true);
    try {
      // Call backend API /transaction/verify
      const response = await transactionAPI.verifyTransaction(otp, transactionId);

      alert("Transaction completed successfully!");

      // Redirect to transaction history or home
      navigate("/transactions");
    } catch (err) {
      alert(err.message || "Transaction verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-md w-96">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Verify Transaction</h2>
        <p className="text-gray-500 mb-6">
          Enter the OTP sent to your registered email to complete the transaction.
        </p>

        <form onSubmit={handleVerify}>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Enter OTP"
            className="w-full px-4 py-2 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {loading ? "Verifying..." : "Verify Transaction"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/transfer")}
            className="w-full mt-3 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition"
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
};
