import { useAuthStore } from '../store/authStore'

export default function Dashboard() {
  const { logout } = useAuthStore()
  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <div>
        <h1 className="text-2xl mb-4">Dashboard</h1>
        <button onClick={logout} className="text-red-400 hover:underline">Logout</button>
      </div>
    </div>
  )
}
