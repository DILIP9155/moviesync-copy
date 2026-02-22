import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../api/client';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { token, setToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) navigate('/', { replace: true });
  }, [token, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await auth.login(email, password);
      setToken(data.token, data.user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold text-xl">
            M
          </div>
          <span className="text-xl font-semibold text-white">Moveinsync</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
          <h1 className="text-2xl font-semibold text-white mb-2">Sign in</h1>
          <p className="text-slate-400 text-sm mb-6">Vehicle Tracking & Geofence</p>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-medium py-3 px-4 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <p className="mt-6 text-center text-slate-400 text-sm">
            Don't have an account?{' '}
            <Link to="/signup" className="text-teal-400 hover:text-teal-300">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
