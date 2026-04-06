import { useEffect, useState } from "react";
import { Bar, Pie, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend
);

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState({
    totalOTPGenerated: 0,
    totalVerified: 0,
    failedAttempts: 0,
    blockedUsers: 0,
    averageDeliveryTime: 0,
    riskyLogins: 0,
    dailyOTPData: [],
    blockedUserTrend: [],
  });

  useEffect(() => {
    fetch("http://localhost:5000/api/v1/admin/analytics", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setAnalytics(data));
  }, []);

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <h2>Total OTP Generated</h2>
          <p className="text-3xl font-bold">{analytics.totalOTPGenerated}</p>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h2>Total Verified</h2>
          <p className="text-3xl font-bold">{analytics.totalVerified}</p>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h2>Failed Attempts</h2>
          <p className="text-3xl font-bold">{analytics.failedAttempts}</p>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h2>Blocked Users</h2>
          <p className="text-3xl font-bold">{analytics.blockedUsers}</p>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h2>Average Delivery Time</h2>
          <p className="text-3xl font-bold">{analytics.averageDeliveryTime}s</p>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h2>Risky Device Logins</h2>
          <p className="text-3xl font-bold">{analytics.riskyLogins}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded shadow">
          <Bar
            data={{
              labels: analytics.dailyOTPData.map((d) => d.date),
              datasets: [
                {
                  label: "OTP Generated Per Day",
                  data: analytics.dailyOTPData.map((d) => d.count),
                  backgroundColor: "#3b82f6",
                },
              ],
            }}
          />
        </div>

        <div className="bg-white p-4 rounded shadow">
          <Pie
            data={{
              labels: ["Verified", "Failed"],
              datasets: [
                {
                  data: [analytics.totalVerified, analytics.failedAttempts],
                  backgroundColor: ["#10b981", "#ef4444"],
                },
              ],
            }}
          />
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow mt-6">
        <Line
          data={{
            labels: analytics.blockedUserTrend.map((d) => d.date),
            datasets: [
              {
                label: "Blocked Users",
                data: analytics.blockedUserTrend.map((d) => d.count),
                borderColor: "#f59e0b",
              },
            ],
          }}
        />
      </div>
    </div>
  );
}