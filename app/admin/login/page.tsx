'use client';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AdminLoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated') return;
    setChecking(true);
    fetch('/api/admin/college').then(r => r.json()).then(d => {
      if (d.success) router.push('/admin');
      else if (d.needsSetup) router.push('/admin/setup');
      else setChecking(false);
    }).catch(() => setChecking(false));
  }, [status, router]);

  if (status === 'loading' || checking) {
    return <div className="page-center"><div className="spinner spinner-lg" /></div>;
  }

  return (
    <div className="page-center relative z-10">
      <div className="text-center max-w-sm mx-auto px-4 anim-fade-up">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6"
             style={{ background: 'linear-gradient(135deg,#06b6d4,#6366f1)', boxShadow: '0 0 48px rgba(6,182,212,0.4)' }}>
          🏛️
        </div>
        <h1 className="font-display text-3xl font-black text-white mb-2">Admin Portal</h1>
        <p className="text-text-2 text-sm mb-8">Sign in with Google to access your institution&apos;s dashboard</p>

        {session ? (
          <div className="glass-card p-6 text-center">
            <p className="text-text-2 text-sm mb-4">Signed in as <strong className="text-white">{session.user?.email}</strong></p>
            <p className="text-rose-400 text-sm mb-4">This account has no college registered yet.</p>
            <button onClick={() => router.push('/admin/setup')} className="btn btn-cyan btn-full mb-3">Register Your College →</button>
            <button onClick={() => signOut()} className="btn btn-ghost btn-full btn-sm">Sign Out</button>
          </div>
        ) : (
          <button onClick={() => signIn('google', { callbackUrl: '/admin/login' })} className="btn btn-cyan btn-xl btn-full">
            <GoogleIcon /> Sign in with Google
          </button>
        )}

        <a href="/login" className="block mt-6 text-text-3 text-xs hover:text-text-2 transition-colors">← Back to Student Login</a>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>;
}
