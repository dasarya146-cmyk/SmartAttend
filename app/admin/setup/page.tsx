'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AdminSetupPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: string; msg: string } | null>(null);
  const [form, setForm] = useState({
    collegeName: '', shortName: '', campusName: '',
    campusLat: '', campusLon: '', campusRadius: '500',
    windowStart: '08:00', windowEnd: '18:00',
    courses: 'BTech,MCA,MBA,MSc,Other',
  });

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/admin/login');
    if (status === 'authenticated') {
      fetch('/api/admin/college').then(r => r.json()).then(d => {
        if (d.success) router.push('/admin');
      }).catch(() => {});
    }
  }, [status, router]);

  const showToast = (type: string, msg: string) => { setToast({ type, msg }); setTimeout(() => setToast(null), 4000); };

  const getLocation = () => {
    navigator.geolocation.getCurrentPosition(pos => {
      setForm(f => ({ ...f, campusLat: pos.coords.latitude.toFixed(7), campusLon: pos.coords.longitude.toFixed(7) }));
      showToast('success', 'Location captured! You can fine-tune the coordinates.');
    }, () => showToast('error', 'Could not get location. Enter coordinates manually.'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.collegeName || !form.shortName || !form.campusName || !form.campusLat || !form.campusLon) {
      showToast('error', 'Please fill all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, courses: form.courses.split(',').map(c => c.trim()).filter(Boolean) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('success', 'College registered! Redirecting to dashboard...');
      setTimeout(() => router.push('/admin'), 1500);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Registration failed.');
      setSubmitting(false);
    }
  };

  if (status === 'loading') return <div className="page-center"><div className="spinner spinner-lg" /></div>;

  return (
    <div className="relative z-10 min-h-screen py-10 px-4">
      {toast && <div className={`toast toast-${toast.type} fixed bottom-6 right-6 z-50`}><span className="toast-icon">{toast.type === 'success' ? '✅' : '❌'}</span><div className="toast-body"><div className="toast-msg">{toast.msg}</div></div></div>}
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-4" style={{ background: 'linear-gradient(135deg,#06b6d4,#6366f1)', boxShadow: '0 0 40px rgba(6,182,212,0.4)' }}>🏛️</div>
          <h1 className="font-display text-2xl font-black text-white">Register Your College</h1>
          <p className="text-text-2 text-sm mt-1">Set up your institution on SmartAttend</p>
          {session?.user && <p className="text-text-3 text-xs mt-2">Admin: {session.user.email}</p>}
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
          <div>
            <label className="form-label">College / Institution Name <span className="text-rose-400">*</span></label>
            <input className="form-input" value={form.collegeName} onChange={e => setForm(f => ({ ...f, collegeName: e.target.value }))} placeholder="e.g. GITAM University, Bhubaneswar" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Short Name <span className="text-rose-400">*</span></label>
              <input className="form-input" value={form.shortName} onChange={e => setForm(f => ({ ...f, shortName: e.target.value.toUpperCase() }))} placeholder="e.g. GITAM" maxLength={10} required />
            </div>
            <div>
              <label className="form-label">Campus Name <span className="text-rose-400">*</span></label>
              <input className="form-input" value={form.campusName} onChange={e => setForm(f => ({ ...f, campusName: e.target.value }))} placeholder="e.g. Main Campus" required />
            </div>
          </div>

          <div>
            <label className="form-label">Campus Coordinates <span className="text-rose-400">*</span></label>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <input className="form-input" type="number" step="any" value={form.campusLat} onChange={e => setForm(f => ({ ...f, campusLat: e.target.value }))} placeholder="Latitude" required />
              <input className="form-input" type="number" step="any" value={form.campusLon} onChange={e => setForm(f => ({ ...f, campusLon: e.target.value }))} placeholder="Longitude" required />
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={getLocation}>📍 Auto-detect My Location</button>
          </div>

          <div>
            <label className="form-label">Campus Radius (meters)</label>
            <input className="form-input" type="number" min="50" value={form.campusRadius} onChange={e => setForm(f => ({ ...f, campusRadius: e.target.value }))} placeholder="500" />
            <p className="text-text-3 text-xs mt-1">Students must be within this radius to mark attendance</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Attendance Window Start</label>
              <input className="form-input" type="time" value={form.windowStart} onChange={e => setForm(f => ({ ...f, windowStart: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Attendance Window End</label>
              <input className="form-input" type="time" value={form.windowEnd} onChange={e => setForm(f => ({ ...f, windowEnd: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="form-label">Active Courses (comma-separated)</label>
            <input className="form-input" value={form.courses} onChange={e => setForm(f => ({ ...f, courses: e.target.value }))} placeholder="BTech,MCA,MBA,MSc,Other" />
          </div>

          <button type="submit" className="btn btn-primary btn-xl btn-full" disabled={submitting}>
            {submitting ? <><div className="spinner spinner-white w-5 h-5 border-2" /> Registering...</> : '🚀 Register College & Open Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}
