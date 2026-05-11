'use client';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';

type Panel = 'overview' | 'records' | 'students' | 'settings';

interface College { name: string; shortName: string; campusName: string; campusLat: number; campusLon: number; campusRadius: number; windowStart: string; windowEnd: string; courses: string[]; adminEmail: string; }
interface Stats { totalStudents: number; totalAttendance: number; todayCount: number; courseBreakdown: { _id: string; count: number }[]; branchBreakdown: { _id: string; count: number }[]; chart: { labels: string[]; data: number[] }; recentToday: { name: string; regNo: string; course: string; time: string; branch: string; faceVerified: boolean; faceConfidence: number }[]; college: College; }
interface AttRecord { _id: string; name: string; regNo: string; branch: string; semester: string; course: string; date: string; time: string; distanceFromCampus: string; faceVerified: boolean; faceConfidence: number; latitude: number; longitude: number; }
interface Student { _id: string; name: string; regNo: string; branch: string; semester: string; course: string; email: string; photoUrl: string | null; createdAt: string; }

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [records, setRecords] = useState<AttRecord[]>([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: string; msg: string } | null>(null);

  // Filters
  const [filterDate, setFilterDate] = useState('today');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [search, setSearch] = useState('');

  // Settings form
  const [settingsForm, setSettingsForm] = useState<Partial<College>>({});
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Photo modal
  const [photoModal, setPhotoModal] = useState<{ id: string; name: string } | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const showToast = (type: string, msg: string) => { setToast({ type, msg }); setTimeout(() => setToast(null), 4500); };

  // Auth guard
  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/admin/login'); return; }
    if (status === 'authenticated') {
      fetch('/api/admin/college').then(r => r.json()).then(d => {
        if (!d.success) { if (d.needsSetup) router.push('/admin/setup'); else router.push('/admin/login'); }
      });
    }
  }, [status, router]);

  const loadStats = useCallback(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(d => {
      if (d.success) { setStats(d.stats); setSettingsForm({ ...d.stats.college }); }
      setLoading(false);
    });
  }, []);

  const loadRecords = useCallback(() => {
    const p = new URLSearchParams({ date: filterDate, course: filterCourse, branch: filterBranch, search });
    fetch(`/api/admin/attendance?${p}`).then(r => r.json()).then(d => {
      if (d.success) { setRecords(d.records); setRecordsTotal(d.total); }
    });
  }, [filterDate, filterCourse, filterBranch, search]);

  const loadStudents = useCallback(() => {
    fetch('/api/admin/students').then(r => r.json()).then(d => { if (d.success) setStudents(d.students); });
  }, []);

  useEffect(() => { if (status === 'authenticated') loadStats(); }, [status, loadStats]);
  useEffect(() => { if (panel === 'records') loadRecords(); }, [panel, loadRecords]);
  useEffect(() => { if (panel === 'students') loadStudents(); }, [panel, loadStudents]);

  const deleteRecord = async (id: string) => {
    if (!confirm('Delete this attendance record?')) return;
    const res = await fetch(`/api/attendance/${id}`, { method: 'DELETE' });
    const d = await res.json();
    if (d.success) { showToast('success', 'Record deleted.'); loadRecords(); } else showToast('error', d.error);
  };

  const openPhoto = async (id: string, name: string) => {
    setPhotoModal({ id, name }); setPhotoUrl(null);
    const d = await fetch(`/api/attendance/${id}/photo`).then(r => r.json());
    setPhotoUrl(d.photoData || null);
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault(); setSettingsSaving(true);
    const res = await fetch('/api/admin/college', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settingsForm) });
    const d = await res.json();
    if (d.success) showToast('success', 'Settings saved!'); else showToast('error', d.error || 'Save failed.');
    setSettingsSaving(false);
  };

  const exportCSV = () => {
    const p = new URLSearchParams({ date: filterDate, course: filterCourse, branch: filterBranch });
    window.open(`/api/admin/export?${p}`, '_blank');
  };

  const navItems: { id: Panel; icon: string; label: string }[] = [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'records', icon: '📋', label: 'Attendance' },
    { id: 'students', icon: '👥', label: 'Students' },
    { id: 'settings', icon: '⚙️', label: 'Settings' },
  ];

  if (loading || status === 'loading') {
    return <div className="page-center"><div className="text-center"><div className="spinner spinner-lg mx-auto mb-4" /><p className="text-text-2 text-sm">Loading dashboard...</p></div></div>;
  }

  return (
    <div className="admin-layout relative z-10">
      {/* Toast */}
      {toast && <div className={`toast toast-${toast.type} fixed bottom-6 right-6 z-50`}><span className="toast-icon">{toast.type === 'success' ? '✅' : '❌'}</span><div className="toast-body"><div className="toast-msg">{toast.msg}</div></div></div>}

      {/* Photo Modal */}
      {photoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} onClick={() => setPhotoModal(null)}>
          <div className="glass-card p-5 max-w-sm w-full anim-scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-white mb-3 text-center">{photoModal.name}</h3>
            {photoUrl ? <img src={photoUrl} alt="Attendance photo" className="w-full rounded-xl" /> : <div className="h-48 flex items-center justify-center"><div className="spinner" /></div>}
            <button className="btn btn-ghost btn-full btn-sm mt-3" onClick={() => setPhotoModal(null)}>Close</button>
          </div>
        </div>
      )}

      {/* Sidebar */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''} z-40`}>
        <div className="p-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg,#6366f1,#06b6d4)' }}>S</div>
            <div className="min-w-0">
              <div className="font-bold text-white text-sm truncate">SmartAttend</div>
              <div className="text-text-3 text-xs truncate">{stats?.college?.shortName || 'Admin'}</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <button key={item.id} onClick={() => { setPanel(item.id); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${panel === item.id ? 'text-white' : 'text-text-2 hover:text-white hover:bg-white/5'}`}
                    style={panel === item.id ? { background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)' } : {}}>
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          {session?.user?.image && <Image src={session.user.image} alt="" width={28} height={28} className="rounded-full mb-2" />}
          <div className="text-text-2 text-xs truncate mb-2">{session?.user?.email}</div>
          <button onClick={() => signOut({ callbackUrl: '/admin/login' })} className="btn btn-ghost btn-full btn-sm">Sign Out</button>
        </div>
      </aside>

      {/* Main */}
      <div className="admin-content">
        {/* Topbar */}
        <div className="sticky top-0 z-20 px-5 py-3 flex items-center justify-between" style={{ background: 'rgba(8,12,20,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 rounded-lg hover:bg-white/10" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
            <h1 className="font-bold text-white capitalize">{panel === 'overview' ? stats?.college?.name || 'Dashboard' : panel}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} className="btn btn-ghost btn-sm hidden sm:flex">⬇️ Export CSV</button>
            <a href="/" className="btn btn-ghost btn-sm">👁️ Student View</a>
          </div>
        </div>

        {/* ── OVERVIEW PANEL ── */}
        {panel === 'overview' && stats && (
          <div className="admin-panel active">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                { icon: '📊', value: stats.totalAttendance, label: 'Total Records', color: '#6366f1' },
                { icon: '📅', value: stats.todayCount, label: "Today's Attendance", color: '#10b981' },
                { icon: '👥', value: stats.totalStudents, label: 'Registered Students', color: '#06b6d4' },
                { icon: '🏛️', value: stats.college.shortName, label: stats.college.name.substring(0, 20), color: '#8b5cf6' },
              ].map((s, i) => (
                <div key={i} className="glass-card p-5 anim-fade-up" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="text-2xl mb-2">{s.icon}</div>
                  <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-text-3 text-xs mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
              {/* Bar Chart */}
              <div className="glass-card p-5">
                <h3 className="font-bold text-white text-sm mb-4">7-Day Attendance Trend</h3>
                <div className="flex items-end gap-2 h-28">
                  {stats.chart.data.map((count, i) => {
                    const max = Math.max(...stats.chart.data, 1);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="text-xs text-text-3">{count > 0 ? count : ''}</div>
                        <div className="w-full rounded-t-sm transition-all" style={{ height: `${(count / max) * 90}px`, minHeight: '3px', background: 'linear-gradient(to top,#6366f1,#06b6d4)', opacity: count > 0 ? 1 : 0.2 }} />
                        <div className="text-text-3 text-[10px] text-center truncate w-full">{stats.chart.labels[i]?.split(' ')[0]}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Course Breakdown */}
              <div className="glass-card p-5">
                <h3 className="font-bold text-white text-sm mb-4">Course Distribution</h3>
                <div className="space-y-2">
                  {stats.courseBreakdown.map(c => {
                    const total = stats.courseBreakdown.reduce((a, b) => a + b.count, 0);
                    const pct = total > 0 ? Math.round((c.count / total) * 100) : 0;
                    return (
                      <div key={c._id}>
                        <div className="flex justify-between text-xs mb-1"><span className="text-text-2">{c._id}</span><span className="text-white font-bold">{c.count} ({pct}%)</span></div>
                        <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#6366f1,#06b6d4)' }} />
                        </div>
                      </div>
                    );
                  })}
                  {stats.courseBreakdown.length === 0 && <p className="text-text-3 text-sm text-center py-4">No data yet</p>}
                </div>
              </div>
            </div>

            {/* Today's Activity */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white text-sm">Today&apos;s Activity</h3>
                <button onClick={() => setPanel('records')} className="btn btn-ghost btn-sm">View All →</button>
              </div>
              {stats.recentToday.length === 0 ? (
                <div className="text-center py-8 text-text-3">
                  <div className="text-3xl mb-2">📭</div>
                  <p className="text-sm">No attendance marked today yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {stats.recentToday.map((r, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: 'rgba(99,102,241,0.2)' }}>{r.name[0]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-semibold truncate">{r.name}</div>
                        <div className="text-text-3 text-xs">{r.regNo} · {r.branch} · {r.course}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-text-2 text-xs">{r.time}</div>
                        {r.faceVerified && <div className="text-emerald-400 text-xs">✅ {Math.round((r.faceConfidence || 0) * 100)}%</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── RECORDS PANEL ── */}
        {panel === 'records' && (
          <div className="admin-panel active">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-5 p-4 glass-card">
              <select className="form-input" style={{ width: 'auto', minWidth: 120 }} value={filterDate} onChange={e => setFilterDate(e.target.value)}>
                <option value="today">Today</option>
                <option value="all">All Time</option>
              </select>
              <select className="form-input" style={{ width: 'auto', minWidth: 120 }} value={filterCourse} onChange={e => setFilterCourse(e.target.value)}>
                <option value="">All Courses</option>
                {stats?.college?.courses?.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input className="form-input flex-1" style={{ minWidth: 180 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search name, reg no..." />
              <button onClick={loadRecords} className="btn btn-ghost btn-sm">↺ Refresh</button>
              <button onClick={exportCSV} className="btn btn-primary btn-sm">⬇️ CSV</button>
              <span className="badge badge-indigo self-center">{recordsTotal} records</span>
            </div>

            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th><th>Photo</th><th>Name</th><th>Reg No</th><th>Branch</th><th>Sem</th><th>Course</th><th>Date</th><th>Time</th><th>Distance</th><th>Face</th><th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.length === 0 ? (
                      <tr><td colSpan={12} className="text-center py-12 text-text-3"><div className="text-3xl mb-2">🔭</div><div className="text-sm">No records found</div></td></tr>
                    ) : records.map((r, i) => (
                      <tr key={r._id}>
                        <td className="text-text-3">{i + 1}</td>
                        <td><button className="btn btn-ghost btn-sm p-1" onClick={() => openPhoto(r._id, r.name)}>📷</button></td>
                        <td className="font-semibold text-white">{r.name}</td>
                        <td className="font-mono text-xs">{r.regNo}</td>
                        <td>{r.branch}</td>
                        <td>{r.semester}</td>
                        <td><span className="badge badge-indigo">{r.course}</span></td>
                        <td className="whitespace-nowrap">{r.date}</td>
                        <td className="whitespace-nowrap text-xs">{r.time}</td>
                        <td>{r.distanceFromCampus}</td>
                        <td>{r.faceVerified ? <span className="badge badge-emerald text-xs">✅ {Math.round((r.faceConfidence || 0) * 100)}%</span> : <span className="badge badge-rose">❌</span>}</td>
                        <td><button className="btn btn-danger btn-sm" onClick={() => deleteRecord(r._id)}>🗑️</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── STUDENTS PANEL ── */}
        {panel === 'students' && (
          <div className="admin-panel active">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <input className="form-input" style={{ width: 240 }} placeholder="🔍 Search students..." onChange={e => { setSearch(e.target.value); setTimeout(loadStudents, 300); }} />
              </div>
              <span className="badge badge-indigo">{students.length} students</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {students.length === 0 ? (
                <div className="col-span-full text-center py-12 text-text-3"><div className="text-4xl mb-3">👥</div><p>No students registered yet</p></div>
              ) : students.map(s => (
                <div key={s._id} className="glass-card p-5 hover:border-accent-indigo/30 transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                      {s.photoUrl ? <Image src={s.photoUrl} alt="" width={48} height={48} className="rounded-2xl" /> : s.name[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate">{s.name}</div>
                      <div className="text-text-3 text-xs truncate">{s.email}</div>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs text-text-2">
                    <div className="flex justify-between"><span>Reg No</span><span className="font-mono text-white">{s.regNo}</span></div>
                    <div className="flex justify-between"><span>Branch</span><span>{s.branch}</span></div>
                    <div className="flex justify-between"><span>Semester</span><span>{s.semester}</span></div>
                    <div className="flex justify-between"><span>Course</span><span className="badge badge-indigo">{s.course}</span></div>
                  </div>
                  <div className="text-text-3 text-xs mt-3">Joined {new Date(s.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SETTINGS PANEL ── */}
        {panel === 'settings' && (
          <div className="admin-panel active">
            <div className="max-w-2xl">
              <form onSubmit={saveSettings} className="space-y-5">
                <div className="glass-card p-6">
                  <h3 className="font-bold text-white mb-4">🏛️ College Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="form-label">College Name</label>
                      <input className="form-input" value={settingsForm.name || ''} onChange={e => setSettingsForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">Short Name</label>
                        <input className="form-input" value={settingsForm.shortName || ''} onChange={e => setSettingsForm(f => ({ ...f, shortName: e.target.value }))} />
                      </div>
                      <div>
                        <label className="form-label">Campus Name</label>
                        <input className="form-input" value={settingsForm.campusName || ''} onChange={e => setSettingsForm(f => ({ ...f, campusName: e.target.value }))} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-6">
                  <h3 className="font-bold text-white mb-4">📍 Campus Location</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">Latitude</label>
                        <input className="form-input" type="number" step="any" value={settingsForm.campusLat || ''} onChange={e => setSettingsForm(f => ({ ...f, campusLat: parseFloat(e.target.value) }))} />
                      </div>
                      <div>
                        <label className="form-label">Longitude</label>
                        <input className="form-input" type="number" step="any" value={settingsForm.campusLon || ''} onChange={e => setSettingsForm(f => ({ ...f, campusLon: parseFloat(e.target.value) }))} />
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Campus Radius (meters)</label>
                      <input className="form-input" type="number" value={settingsForm.campusRadius || 500} onChange={e => setSettingsForm(f => ({ ...f, campusRadius: parseInt(e.target.value) }))} />
                    </div>
                  </div>
                </div>

                <div className="glass-card p-6">
                  <h3 className="font-bold text-white mb-4">⏰ Attendance Window</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Start Time</label>
                      <input className="form-input" type="time" value={settingsForm.windowStart || '08:00'} onChange={e => setSettingsForm(f => ({ ...f, windowStart: e.target.value }))} />
                    </div>
                    <div>
                      <label className="form-label">End Time</label>
                      <input className="form-input" type="time" value={settingsForm.windowEnd || '18:00'} onChange={e => setSettingsForm(f => ({ ...f, windowEnd: e.target.value }))} />
                    </div>
                  </div>
                </div>

                <div className="glass-card p-6">
                  <h3 className="font-bold text-white mb-4">📚 Active Courses</h3>
                  <div>
                    <label className="form-label">Courses (one per line or comma-separated)</label>
                    <input className="form-input" value={(settingsForm.courses || []).join(', ')}
                           onChange={e => setSettingsForm(f => ({ ...f, courses: e.target.value.split(',').map(c => c.trim()).filter(Boolean) }))} />
                    <p className="text-text-3 text-xs mt-1">Students will see these options during onboarding</p>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary btn-xl" disabled={settingsSaving}>
                  {settingsSaving ? <><div className="spinner spinner-white w-5 h-5 border-2" /> Saving...</> : '💾 Save Settings'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
