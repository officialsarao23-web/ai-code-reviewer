import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuthStore } from "../store/authStore";

const API_URL = import.meta.env.VITE_API_URL;

export default function History() {
  const { token, logout } = useAuthStore();
  const navigate = useNavigate();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const res = await axios.get(`${API_URL}/reviews`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReviews(res.data);
    } catch (err) {
      setError("Failed to load review history.");
    } finally {
      setLoading(false);
    }
  };

  const fetchReview = async (id) => {
    try {
      const res = await axios.get(`${API_URL}/reviews/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelected(res.data);
    } catch (err) {
      setError("Failed to load review.");
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const severityColor = (severity) => {
    switch (severity) {
      case "critical": return "bg-red-600/20 text-red-400";
      case "high": return "bg-red-500/20 text-red-400";
      case "medium": return "bg-yellow-500/20 text-yellow-400";
      default: return "bg-gray-500/20 text-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Navbar */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-bold text-blue-400">AI Code Reviewer</span>
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            New Review
          </button>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Review History</h1>
          <p className="text-gray-400">All your past PR reviews in one place.</p>
        </div>

        {loading && (
          <div className="flex items-center gap-3 text-gray-400 py-8">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading reviews...</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm mb-6">
            {error}
          </div>
        )}

        {!loading && reviews.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg mb-2">No reviews yet</p>
            <p className="text-sm mb-6">Analyze your first PR to see it here.</p>
            <button
              onClick={() => navigate("/dashboard")}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition-colors text-white"
            >
              Analyze a PR
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Reviews List */}
          {reviews.length > 0 && (
            <div className="lg:col-span-1 space-y-3">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  onClick={() => fetchReview(review.id)}
                  className={`bg-gray-900 border rounded-xl p-4 cursor-pointer transition-all hover:border-blue-500 ${selected?.id === review.id ? "border-blue-500" : "border-gray-800"}`}
                >
                  <p className="font-mono text-sm text-blue-400 truncate mb-1">{review.repo_name}</p>
                  <p className="text-gray-500 text-xs truncate mb-3">{review.pr_url}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-red-400">🐛 {review.report?.summary?.total_bugs ?? 0}</span>
                      <span className="text-orange-400">🔐 {review.report?.summary?.total_security_issues ?? 0}</span>
                      <span className="text-blue-400">⭐ {review.report?.summary?.quality_score ?? 0}/10</span>
                    </div>
                  </div>
                  <p className="text-gray-600 text-xs mt-2">{formatDate(review.created_at)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Selected Review Detail */}
          {selected && (
            <div className="lg:col-span-2 space-y-4">

              {/* Header */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="text-xl font-bold mb-1">{selected.report.pr_title}</h2>
                <p className="text-gray-400 text-sm mb-4">by @{selected.report.pr_author}</p>
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-gray-800 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold">{selected.report.files_changed}</p>
                    <p className="text-gray-400 text-xs mt-1">Files</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-red-400">{selected.report.summary?.total_bugs}</p>
                    <p className="text-gray-400 text-xs mt-1">Bugs</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-orange-400">{selected.report.summary?.total_security_issues}</p>
                    <p className="text-gray-400 text-xs mt-1">Security</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-blue-400">{selected.report.summary?.quality_score}/10</p>
                    <p className="text-gray-400 text-xs mt-1">Quality</p>
                  </div>
                </div>
              </div>

              {/* Bugs */}
              {selected.report.bugs?.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-4 text-red-400">🐛 Bugs</h3>
                  <div className="space-y-3">
                    {selected.report.bugs.map((bug, i) => (
                      <div key={i} className="border border-gray-800 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded font-semibold ${severityColor(bug.severity)}`}>{bug.severity}</span>
                          <span className="text-gray-500 text-xs font-mono">{bug.line}</span>
                        </div>
                        <p className="text-white text-sm mb-1">{bug.description}</p>
                        <p className="text-gray-400 text-xs">💡 {bug.suggestion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Security */}
              {selected.report.security?.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-4 text-orange-400">🔐 Security</h3>
                  <div className="space-y-3">
                    {selected.report.security.map((issue, i) => (
                      <div key={i} className="border border-gray-800 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded font-semibold ${severityColor(issue.severity)}`}>{issue.severity}</span>
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
              {selected.report.quality?.summary && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-4 text-blue-400">📊 Quality</h3>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-4xl font-bold text-blue-400">{selected.report.quality.score}</div>
                    <p className="text-white text-sm">{selected.report.quality.summary}</p>
                  </div>
                  {selected.report.quality.positives?.map((p, i) => (
                    <p key={i} className="text-green-400 text-sm">✅ {p}</p>
                  ))}
                  {selected.report.quality.issues?.map((issue, i) => (
                    <div key={i} className="mt-2">
                      <p className="text-gray-300 text-sm">⚠️ {issue.description}</p>
                      <p className="text-gray-500 text-xs ml-4">→ {issue.recommendation}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Suggestions */}
              {selected.report.suggestions?.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-4 text-purple-400">💡 Suggestions</h3>
                  <div className="space-y-3">
                    {selected.report.suggestions.map((s, i) => (
                      <div key={i} className="border border-gray-800 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">{s.category}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${severityColor(s.priority)}`}>{s.priority}</span>
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
                  href={selected.report.pr_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm underline underline-offset-2"
                >
                  View on GitHub →
                </a>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}