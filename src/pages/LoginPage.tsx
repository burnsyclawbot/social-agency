import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { APP_VERSION } from '../constants/version';

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, name: string, password: string) => Promise<void>;
}

export default function LoginPage({ onLogin, onRegister }: LoginPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await onLogin(email, password);
      } else {
        await onRegister(email, name, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-off-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / header */}
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl text-charcoal">Social Agency</h1>
          <p className="text-soft-gray mt-2">Social media management platform</p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-xl shadow-sm border border-warm-beige/30 p-8">
          {/* Tab toggle */}
          <div className="flex mb-6 bg-off-white rounded-lg p-1">
            <button
              onClick={() => { setMode('login'); setError(null); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                mode === 'login'
                  ? 'bg-white text-charcoal shadow-sm'
                  : 'text-soft-gray hover:text-charcoal'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('register'); setError(null); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                mode === 'register'
                  ? 'bg-white text-charcoal shadow-sm'
                  : 'text-soft-gray hover:text-charcoal'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  className="w-full px-4 py-2.5 border border-warm-beige/50 rounded-lg text-charcoal placeholder-soft-gray/60 focus:outline-none focus:ring-2 focus:ring-dusty-rose/30 focus:border-dusty-rose"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-2.5 border border-warm-beige/50 rounded-lg text-charcoal placeholder-soft-gray/60 focus:outline-none focus:ring-2 focus:ring-dusty-rose/30 focus:border-dusty-rose"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'At least 6 characters' : 'Your password'}
                required
                minLength={mode === 'register' ? 6 : undefined}
                className="w-full px-4 py-2.5 border border-warm-beige/50 rounded-lg text-charcoal placeholder-soft-gray/60 focus:outline-none focus:ring-2 focus:ring-dusty-rose/30 focus:border-dusty-rose"
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  className="w-full px-4 py-2.5 border border-warm-beige/50 rounded-lg text-charcoal placeholder-soft-gray/60 focus:outline-none focus:ring-2 focus:ring-dusty-rose/30 focus:border-dusty-rose"
                />
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-dusty-rose text-white rounded-lg font-medium hover:bg-dusty-rose/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : mode === 'login' ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Version badge */}
      <div className="fixed bottom-4 right-4 text-xs text-soft-gray/60">
        v{APP_VERSION}
      </div>
    </div>
  );
}
