import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authAPI, authHelpers } from "../services/api";

export const OTPVerification = () => {
  const [otp, setOtp] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  // Values passed from SignIn / AdminSignIn
  const email = location.state?.email;
  const isAdminLogin = location.state?.isAdminLogin || false;

  const handleVerify = async (e) => {
    e.preventDefault();

    if (!otp.trim()) {
      alert("Please enter OTP");
      return;
    }

    try {
      // Verify OTP
      const response = await authAPI.verifyOTP({
        email,
        otp,
        isAdminLogin,
      });

      // Save token + user
      authHelpers.setToken(response.token);
      authHelpers.setUser(response.user);

      // If admin, save admin flag and redirect to dashboard
      if (response.isAdmin) {
        localStorage.setItem("isAdmin", "true");
        localStorage.setItem("adminUser", JSON.stringify(response.user));

        alert("Admin OTP Verified Successfully!");
        navigate("/admin/dashboard");
      } else {
        alert("OTP Verified Successfully!");
        navigate("/home");
      }
    } catch (err) {
      alert(err.message || "OTP verification failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-md w-96">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Verify OTP
        </h2>

        <p className="text-gray-500 mb-6">
          Enter the OTP sent to{" "}
          <span className="font-medium">{email}</span>
        </p>

        {isAdminLogin && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
            Admin verification required
          </div>
        )}

        <form onSubmit={handleVerify}>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Enter OTP"
            className="w-full px-4 py-2 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            type="submit"
            className={`w-full py-3 text-white font-semibold rounded-lg transition ${
              isAdminLogin
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isAdminLogin ? "Verify Admin OTP" : "Verify OTP"}
          </button>
        </form>
      </div>
    </div>
  );
};