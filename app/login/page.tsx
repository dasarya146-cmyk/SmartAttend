'use client';
import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async (role: 'student' | 'admin') => {
    setLoading(true);
    await signIn('google', { callbackUrl: role === 'admin' ? '/admin' : '/' });
  };

  return (
    <div className="page-center relative z-10">
      <div className="container-sm anim-fade-up">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-6"
               style={{ background: 'linear-gradient(135deg,#6366f1,#06b6d4)', boxShadow: '0 0 48px rgba(99,102,241,0.5)' }}>
            <span className="text-4xl">🎓</span>
          </div>
          <h1 className="font-display text-4xl font-black text-white mb-2">
            Smart<span className="text-gradient">Attend</span>
          </h1>
          <p className="text-text-2 text-sm max-w-xs mx-auto">
            AI-powered GPS &amp; face-verified multi-college attendance platform
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Student Card */}
          <div className="glass-card p-7 flex flex-col gap-5 hover:border-accent-indigo/40 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl"
                   style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
                📚
              </div>
              <div>
                <div className="font-bold text-white text-base">Student</div>
                <div className="text-text-3 text-xs">Mark your attendance</div>
              </div>
            </div>
            <ul className="space-y-1.5 text-xs text-text-2">
              <li className="flex items-center gap-2"><span className="text-accent-emerald">✓</span> GPS campus check</li>
              <li className="flex items-center gap-2"><span className="text-accent-emerald">✓</span> Real face verification</li>
              <li className="flex items-center gap-2"><span className="text-accent-emerald">✓</span> Instant confirmation</li>
            </ul>
            <button
              onClick={() => handleGoogleSignIn('student')}
              disabled={loading}
              className="btn btn-primary btn-full"
            >
              <GoogleIcon />
              <span className="btn-text">Continue as Student</span>
            </button>
          </div>

          {/* Admin Card */}
          <div className="glass-card p-7 flex flex-col gap-5 hover:border-accent-cyan/40 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl"
                   style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)' }}>
                🏛️
              </div>
              <div>
                <div className="font-bold text-white text-base">Admin / Teacher</div>
                <div className="text-text-3 text-xs">Manage your college</div>
              </div>
            </div>
            <ul className="space-y-1.5 text-xs text-text-2">
              <li className="flex items-center gap-2"><span className="text-accent-cyan">✓</span> Full dashboard access</li>
              <li className="flex items-center gap-2"><span className="text-accent-cyan">✓</span> Student &amp; attendance data</li>
              <li className="flex items-center gap-2"><span className="text-accent-cyan">✓</span> Analytics &amp; CSV export</li>
            </ul>
            <button
              onClick={() => handleGoogleSignIn('admin')}
              disabled={loading}
              className="btn btn-cyan btn-full"
            >
              <GoogleIcon />
              <span className="btn-text">Continue as Admin</span>
            </button>
          </div>
        </div>

        <p className="text-center text-text-3 text-xs mt-8">
          Secure login via Google OAuth • No password required • 100% Free Platform
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
