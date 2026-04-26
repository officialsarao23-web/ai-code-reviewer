import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuthStore } from "../store/authStore";

const API_URL = import.meta.env.VITE_API_URL;

export default function Dashboard() {
  const { token, logout } = useAuthStore();
  const navigate = useNavigate();

  const [prUrl, setPrUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState(null);

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };

  const handleAnalyze = async () => {
    if (!prUrl.trim()) {
      setError("Please enter a GitHub PR URL");
      return;
    }
    setError("");
    setReport(null);
    setLoading(true);
    try {
      const res = await axios.post(
        `${API_URL}/review/pr`,
        { pr_url: prUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReport(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong. Check the PR URL and try again.");
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (status) => {
    switch (status) {
      case "added": return "text-green-400 bg-green-400/10";
      case "removed": return "text-red-400 bg-red-400/10";
      case "modified": return "text-yellow-400 bg-yellow-400/10";
      case "renamed": return "text-blue-400 bg-blue-400/10";
      default: return "text-gray-400 bg-gray-400/10";
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Navbar */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-blue-400">AI Code Reviewer</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Logout
        </button>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Review a Pull Request</h1>
          <p className="text-gray-400">Paste a GitHub PR URL and get an instant AI-powered code review.</p>
        </div>

        {/* Input */}
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={prUrl}
            onChange={(e) => setPrUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            placeholder="https://github.com/owner/repo/pull/42"
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-3 text-gray-400 py-8">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span>Fetching PR data and running AI analysis... this may take 20-30 seconds</span>
          </div>
        )}

        {/* Report */}
        {report && (
          <div className="space-y-6">

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-white">{report.files_changed}</p>
                <p className="text-gray-400 text-sm mt-1">Files Changed</p>
              </div>
              <div className="bg-gray-900 border border-red-900 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-red-400">{report.summary.total_bugs}</p>
                <p className="text-gray-400 text-sm mt-1">Bugs Found</p>
              </div>
              <div className="bg-gray-900 border border-orange-900 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-orange-400">{report.summary.total_security_issues}</p>
                <p className="text-gray-400 text-sm mt-1">Security Issues</p>
              </div>
              <div className="bg-gray-900 border border-blue-900 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-blue-400">{report.summary.quality_score}/10</p>
                <p className="text-gray-400 text-sm mt-1">Quality Score</p>
              </div>
            </div>

            {/* Bugs */}
            {report.bugs.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4 text-red-400">🐛 Bugs Detected</h2>
                <div className="space-y-3">
                  {report.bugs.map((bug, i) => (
                    <div key={i} className="border border-gray-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-semibold ${bug.severity === "high" ? "bg-red-500/20 text-red-400" : bug.severity === "medium" ? "bg-yellow-500/20 text-yellow-400" : "bg-gray-500/20 text-gray-400"}`}>
                          {bug.severity}
                        </span>
                        <span className="text-gray-400 text-xs font-mono">{bug.line}</span>
                      </div>
                      <p className="text-white text-sm mb-1">{bug.description}</p>
                      <p className="text-gray-400 text-xs">💡 {bug.suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Security */}
            {report.security.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4 text-orange-400">🔐 Security Issues</h2>
                <div className="space-y-3">
                  {report.security.map((issue, i) => (
                    <div key={i} className="border border-gray-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-semibold ${issue.severity === "critical" ? "bg-red-600/20 text-red-400" : issue.severity === "high" ? "bg-orange-500/20 text-orange-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                          {issue.severity}
                        </span>
                        <span className="text-blue-400 text-xs">{issue.vulnerability}</span>
                      </div>
                      <p className="text-white text-sm mb-1">{issue.description}</p>
                      <p className="text-gray-400 text-xs">🔧 {issue.fix}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quality */}
            {report.quality.summary && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4 text-blue-400">📊 Code Quality</h2>
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-5xl font-bold text-blue-400">{report.quality.score}</div>
                  <div>
                    <p className="text-white text-sm">{report.quality.summary}</p>
                    <p className="text-gray-500 text-xs mt-1">out of 10</p>
                  </div>
                </div>
                {report.quality.positives?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-green-400 text-xs font-semibold mb-2">✅ What's good:</p>
                    {report.quality.positives.map((p, i) => (
                      <p key={i} className="text-gray-300 text-sm">• {p}</p>
                    ))}
                  </div>
                )}
                {report.quality.issues?.length > 0 && (
                  <div className="mb-2">
                    <p className="text-yellow-400 text-xs font-semibold mb-2">⚠️ Issues:</p>
                    {report.quality.issues.map((issue, i) => (
                      <div key={i} className="mb-2">
                        <p className="text-gray-300 text-sm">• {issue.description}</p>
                        <p className="text-gray-500 text-xs ml-3">→ {issue.recommendation}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Suggestions */}
            {report.suggestions.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4 text-purple-400">💡 Improvement Suggestions</h2>
                <div className="space-y-3">
                  {report.suggestions.map((s, i) => (
                    <div key={i} className="border border-gray-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 font-semibold">{s.category}</span>
                        <span className={`text-xs px-2 py-0.5 rounded font-semibold ${s.priority === "high" ? "bg-red-500/20 text-red-400" : s.priority === "medium" ? "bg-yellow-500/20 text-yellow-400" : "bg-gray-500/20 text-gray-400"}`}>{s.priority}</span>
                      </div>
                      <p className="text-white text-sm font-medium mb-1">{s.title}</p>
                      <p className="text-gray-400 text-xs">{s.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* View on GitHub */}
            <div className="text-center pb-8">
              <a
                href={report.pr_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-sm underline underline-offset-2"
              >
                View this PR on GitHub →
              </a>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
