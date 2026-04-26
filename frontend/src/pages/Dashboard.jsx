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
            <span>Fetching PR data from GitHub...</span>
          </div>
        )}

        {/* Report */}
        {report && (
          <div className="space-y-6">

            {/* PR Metadata */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4 text-blue-400">Pull Request</h2>
              <h3 className="text-xl font-bold mb-3">{report.metadata.title}</h3>
              {report.metadata.description && (
                <p className="text-gray-400 text-sm mb-4">{report.metadata.description}</p>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Author</span>
                  <p className="text-white font-medium">@{report.metadata.author}</p>
                </div>
                <div>
                  <span className="text-gray-500">State</span>
                  <p className="text-white font-medium capitalize">{report.metadata.state}</p>
                </div>
                <div>
                  <span className="text-gray-500">Base Branch</span>
                  <p className="text-white font-mono text-xs bg-gray-800 px-2 py-1 rounded w-fit">{report.metadata.base_branch}</p>
                </div>
                <div>
                  <span className="text-gray-500">Head Branch</span>
                  <p className="text-white font-mono text-xs bg-gray-800 px-2 py-1 rounded w-fit">{report.metadata.head_branch}</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-white">{report.files_changed}</p>
                <p className="text-gray-400 text-sm mt-1">Files Changed</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-green-400">+{report.total_additions}</p>
                <p className="text-gray-400 text-sm mt-1">Additions</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-red-400">-{report.total_deletions}</p>
                <p className="text-gray-400 text-sm mt-1">Deletions</p>
              </div>
            </div>

            {/* Files */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4 text-blue-400">Changed Files</h2>
              <div className="space-y-3">
                {report.files.map((file, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded capitalize shrink-0 ${statusColor(file.status)}`}>
                        {file.status}
                      </span>
                      <span className="font-mono text-sm text-gray-300 truncate">{file.filename}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm shrink-0 ml-4">
                      <span className="text-green-400">+{file.additions}</span>
                      <span className="text-red-400">-{file.deletions}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* View on GitHub */}
            <div className="text-center">
              <a
                href={report.metadata.url}
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
