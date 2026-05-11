'use client';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';

interface StudentProfile { name: string; regNo: string; branch: string; semester: string; course: string; collegeName: string; email: string; }
interface Settings { campusLat: number; campusLon: number; campusRadius: number; campusName: string; windowStart: string; windowEnd: string; }
interface CollegeSettings { campusLat: number; campusLon: number; campusRadius: number; campusName: string; windowStart: string; windowEnd: string; name: string; }

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000, toRad = (d: number) => d * Math.PI / 180;
  const a = Math.sin(toRad(lat2 - lat1) / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lon2 - lon1) / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isInWindow(start: string, end: string) {
  const t = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit' }).replace(/^24/, '00');
  const [h, m] = t.split(':').map(Number);
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return h * 60 + m >= sh * 60 + sm && h * 60 + m <= eh * 60 + em;
}

type LocState = 'idle' | 'loading' | 'success' | 'error';
type FaceState = 'idle' | 'loading' | 'scanning' | 'detecting' | 'verified' | 'error';

export default function AttendancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [collegeSettings, setCollegeSettings] = useState<CollegeSettings | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [successRecord, setSuccessRecord] = useState<Record<string, string> | null>(null);
  const [toast, setToast] = useState<{ type: string; title: string; msg: string } | null>(null);
  const [clock, setClock] = useState('');

  // GPS
  const [locState, setLocState] = useState<LocState>('idle');
  const [gpsData, setGpsData] = useState<{ lat: number; lon: number; distance: number; accuracy: number } | null>(null);

  // Face
  const [faceState, setFaceState] = useState<FaceState>('idle');
  const [faceApiLoaded, setFaceApiLoaded] = useState(false);
  const [faceProgress, setFaceProgress] = useState(0);
  const [faceConfidence, setFaceConfidence] = useState(0);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [faceVerified, setFaceVerified] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const holdStartRef = useRef<number | null>(null);
  const HOLD_MS = 2000;

  const showToast = (type: string, title: string, msg = '') => {
    setToast({ type, title, msg });
    setTimeout(() => setToast(null), 5000);
  };

  // Clock
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true }));
    tick(); const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Auth & profile load
  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return; }
    if (status !== 'authenticated') return;
    Promise.all([
      fetch('/api/students/me').then(r => r.json()),
      fetch('/api/students/me/college').then(r => r.json()).catch(() => ({ success: false })),
    ]).then(([me, coll]) => {
      if (!me.success) { router.push(me.needsOnboarding ? '/onboard' : '/login'); return; }
      setProfile(me.student);
      if (coll.success) setCollegeSettings(coll.college);
      setPageLoading(false);
    });
  }, [status, router]);

  // Load face-api.js
  useEffect(() => {
    const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/model/';
    const existing = document.getElementById('faceapi-script');
    if (existing) { setFaceApiLoaded(true); return; }
    const s = document.createElement('script');
    s.id = 'faceapi-script';
    s.src = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/dist/face-api.js';
    s.onload = async () => {
      const fa = getFaceApi();
      await fa.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await fa.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      await fa.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      setFaceApiLoaded(true);
    };
    document.head.appendChild(s);
  }, []);

  const getFaceApi = () => (window as unknown as Record<string, unknown>).faceapi as {
    nets: { tinyFaceDetector: { loadFromUri: (u: string) => Promise<void> }; faceRecognitionNet: { loadFromUri: (u: string) => Promise<void> }; faceLandmark68Net: { loadFromUri: (u: string) => Promise<void> } };
    detectSingleFace: (el: HTMLVideoElement, opts: unknown) => { withFaceLandmarks: () => { withFaceDescriptor: () => Promise<{ descriptor: Float32Array; detection: { score: number } } | null> } };
    TinyFaceDetectorOptions: new (o: object) => unknown;
    matchDimensions: (canvas: HTMLCanvasElement, dims: object) => void;
    resizeResults: (r: unknown, dims: object) => { box: { x: number; y: number; width: number; height: number } };
  };

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const drawCorners = (canvas: HTMLCanvasElement, box: { x: number; y: number; width: number; height: number }, color: string) => {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const { x, y, width: w, height: h } = box;
    const cl = Math.min(w, h) * 0.22;
    ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.shadowColor = color; ctx.shadowBlur = 12; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y + cl); ctx.lineTo(x, y); ctx.lineTo(x + cl, y);
    ctx.moveTo(x + w - cl, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + cl);
    ctx.moveTo(x + w, y + h - cl); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - cl, y + h);
    ctx.moveTo(x + cl, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - cl);
    ctx.stroke();
  };

  const startFaceVerification = async () => {
    if (!faceApiLoaded) { showToast('error', 'Face AI loading', 'Please wait a moment...'); return; }
    setFaceState('loading');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setFaceState('scanning');

      // Fetch stored descriptor
      const descRes = await fetch('/api/students/me/descriptor').then(r => r.json());
      const storedDesc = descRes.faceDescriptor ? new Float32Array(descRes.faceDescriptor) : null;

      const fa = getFaceApi();
      const loop = async () => {
        if (video.readyState < 2) { animFrameRef.current = requestAnimationFrame(loop); return; }

        const det = await fa.detectSingleFace(video, new fa.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
          .withFaceLandmarks().withFaceDescriptor();

        const overlay = overlayRef.current!;
        const displaySize = { width: video.offsetWidth || 320, height: video.offsetHeight || 240 };
        fa.matchDimensions(overlay, displaySize);
        overlay.getContext('2d')!.clearRect(0, 0, overlay.width, overlay.height);

        if (det) {
          const resized = fa.resizeResults(det, displaySize);
          let confidence = 0;
          let matched = true;

          if (storedDesc) {
            // Euclidean distance → similarity
            const dist = Array.from(det.descriptor).reduce((sum, v, i) => sum + (v - storedDesc[i]) ** 2, 0) ** 0.5;
            confidence = Math.max(0, Math.min(1, (1 - dist / 1.2)));
            matched = dist < 0.6; // threshold
          } else {
            confidence = det.detection.score;
          }

          const color = matched ? '#10b981' : '#f43f5e';
          drawCorners(overlay, resized.box, color);
          setFaceConfidence(confidence);

          if (matched) {
            if (!holdStartRef.current) holdStartRef.current = Date.now();
            const elapsed = Date.now() - holdStartRef.current;
            const progress = Math.min((elapsed / HOLD_MS) * 100, 100);
            setFaceProgress(progress);
            setFaceState('detecting');

            if (elapsed >= HOLD_MS) {
              // Capture snapshot
              const cap = canvasRef.current!;
              cap.width = video.videoWidth; cap.height = video.videoHeight;
              cap.getContext('2d')!.drawImage(video, 0, 0);
              setCapturedPhoto(cap.toDataURL('image/jpeg', 0.8));
              setFaceVerified(true);
              setFaceState('verified');
              stopCamera();
              return;
            }
          } else {
            holdStartRef.current = null;
            setFaceProgress(0);
            setFaceState('scanning');
          }
        } else {
          holdStartRef.current = null;
          setFaceProgress(0);
          if (faceState !== 'scanning') setFaceState('scanning');
          overlay.getContext('2d')!.clearRect(0, 0, overlay.width, overlay.height);
        }

        animFrameRef.current = requestAnimationFrame(loop);
      };
      animFrameRef.current = requestAnimationFrame(loop);
    } catch {
      setFaceState('error');
      showToast('error', 'Camera Error', 'Could not access camera. Check permissions.');
    }
  };

  const captureGPS = () => {
    if (!navigator.geolocation) { setLocState('error'); return; }
    setLocState('loading');
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lon, accuracy } = pos.coords;
        const s = collegeSettings;
        const distance = s ? haversine(lat, lon, s.campusLat, s.campusLon) : 9999;
        setGpsData({ lat, lon, distance, accuracy });
        setLocState(s && distance <= s.campusRadius ? 'success' : 'error');
      },
      () => setLocState('error'),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const inWindow = collegeSettings ? isInWindow(collegeSettings.windowStart, collegeSettings.windowEnd) : false;
  const onCampus = locState === 'success' && gpsData !== null && collegeSettings !== null && gpsData.distance <= collegeSettings.campusRadius;
  const allMet = inWindow && onCampus && faceVerified;
  const [submitting, setSubmitting] = useState(false);

  const submitAttendance = async () => {
    if (!allMet || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/attendance/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: gpsData!.lat, longitude: gpsData!.lon, photoData: capturedPhoto, faceVerified: true, faceConfidence }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccessRecord(data.record);
      setSubmitted(true);
    } catch (err) {
      showToast('error', 'Failed', err instanceof Error ? err.message : 'Try again.');
      setSubmitting(false);
    }
  };

  if (pageLoading || status === 'loading') {
    return <div className="page-center"><div className="text-center"><div className="spinner spinner-lg mx-auto mb-4" /><p className="text-text-2 text-sm">Loading your profile...</p></div></div>;
  }

  if (submitted && successRecord) {
    return (
      <div className="page-center relative z-10">
        <div className="container-sm anim-scale-in">
          <div className="success-card">
            <div className="success-icon">✅</div>
            <h2 className="success-title text-gradient">Attendance Marked!</h2>
            <p className="success-sub">Your attendance has been recorded successfully.</p>
            <div className="mt-6 space-y-1">
              {[['Name', successRecord.name], ['Reg No', successRecord.regNo], ['Course', successRecord.course], ['Date', successRecord.date], ['Time', successRecord.time], ['Distance', successRecord.distanceFromCampus]].map(([k, v]) => (
                <div key={k} className="success-row"><span>{k}</span><strong>{v}</strong></div>
              ))}
              <div className="success-row"><span>Face Match</span><strong className="badge badge-emerald">✅ Verified ({Math.round(faceConfidence * 100)}%)</strong></div>
            </div>
            <button onClick={() => signOut({ callbackUrl: '/login' })} className="btn btn-ghost btn-full mt-6">Sign Out</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 min-h-screen pb-10">
      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type} fixed bottom-6 right-6 z-50`}>
          <span className="toast-icon">{toast.type === 'success' ? '✅' : '❌'}</span>
          <div className="toast-body"><div className="toast-title">{toast.title}</div>{toast.msg && <div className="toast-msg">{toast.msg}</div>}</div>
        </div>
      )}

      {/* Top Nav */}
      <nav className="sticky top-0 z-40 px-4 py-3 flex items-center justify-between" style={{ background: 'rgba(8,12,20,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold" style={{ background: 'linear-gradient(135deg,#6366f1,#06b6d4)' }}>S</div>
          <div>
            <div className="text-sm font-bold text-white">SmartAttend</div>
            <div className="text-xs text-text-3">{profile?.collegeName || 'Loading...'}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="badge badge-indigo text-xs hidden sm:flex">{clock} IST</span>
          {session?.user?.image && <Image src={session.user.image} alt="" width={28} height={28} className="rounded-full" />}
          <button onClick={() => signOut({ callbackUrl: '/login' })} className="btn btn-ghost btn-sm">Sign Out</button>
        </div>
      </nav>

      <div className="container-sm px-4 pt-6">
        {/* Profile Banner */}
        {profile && (
          <div className="glass-card p-4 mb-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              {profile.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-white truncate">{profile.name}</div>
              <div className="text-text-3 text-xs">{profile.regNo} · {profile.branch} · {profile.semester} · {profile.course}</div>
            </div>
            <span className="badge badge-indigo text-xs hidden sm:flex">{profile.collegeName}</span>
          </div>
        )}

        {/* Time Window Status */}
        <div className={`flex items-center gap-3 p-3 rounded-xl mb-5 ${inWindow ? 'border border-emerald-500/30' : 'border border-rose-500/30'}`}
             style={{ background: inWindow ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)' }}>
          <span className="text-lg">{inWindow ? '🟢' : '🔴'}</span>
          <div>
            <div className="text-sm font-semibold text-white">{inWindow ? 'Attendance Window Open' : 'Attendance Window Closed'}</div>
            {collegeSettings && <div className="text-xs text-text-3">Allowed: {collegeSettings.windowStart} – {collegeSettings.windowEnd} IST</div>}
          </div>
          <div className="ml-auto font-mono text-xs text-text-2">{clock}</div>
        </div>

        {/* Step 1: GPS */}
        <div className="glass-card p-5 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${locState === 'success' ? 'bg-emerald-500/20 border border-emerald-500/40' : 'bg-white/5 border border-white/10'}`}>📍</div>
            <div>
              <div className="font-bold text-white text-sm">GPS Verification</div>
              <div className="text-text-3 text-xs">Must be within {collegeSettings?.campusRadius || '—'}m of campus</div>
            </div>
            {locState === 'success' && <span className="ml-auto badge badge-emerald">✅ Verified</span>}
          </div>

          {gpsData && (
            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className={`text-lg font-bold ${onCampus ? 'text-emerald-400' : 'text-rose-400'}`}>{Math.round(gpsData.distance)}m</div>
                <div className="text-text-3 text-xs mt-1">From Campus</div>
              </div>
              <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="text-lg font-bold text-text-2">±{Math.round(gpsData.accuracy)}m</div>
                <div className="text-text-3 text-xs mt-1">GPS Accuracy</div>
              </div>
            </div>
          )}

          {locState === 'error' && gpsData && (
            <p className="text-rose-400 text-xs mb-3">❌ {Math.round(gpsData.distance)}m from campus — must be within {collegeSettings?.campusRadius}m</p>
          )}

          <div className="flex gap-2">
            <button className={`btn ${locState === 'success' ? 'btn-emerald' : 'btn-primary'} btn-full`}
                    onClick={captureGPS} disabled={locState === 'loading'}>
              {locState === 'loading' ? <><div className="spinner spinner-white w-4 h-4 border-2" /> Detecting...</> :
               locState === 'success' ? '✅ Location Verified' : '📍 Get My Location'}
            </button>
            {collegeSettings && (
              <a href={`https://maps.google.com/maps?q=${collegeSettings.campusLat},${collegeSettings.campusLon}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">🗺️</a>
            )}
          </div>
        </div>

        {/* Step 2: Face */}
        <div className="glass-card p-5 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${faceVerified ? 'bg-emerald-500/20 border border-emerald-500/40' : 'bg-white/5 border border-white/10'}`}>🤖</div>
            <div>
              <div className="font-bold text-white text-sm">AI Face Verification</div>
              <div className="text-text-3 text-xs">Real-time face matching against your profile</div>
            </div>
            {faceVerified && <span className="ml-auto badge badge-emerald">✅ Matched</span>}
          </div>

          {!faceApiLoaded && (
            <div className="flex items-center gap-2 text-xs text-text-2 mb-3 p-3 rounded-lg" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <div className="spinner w-3 h-3 border" /> Loading face AI models...
            </div>
          )}

          {!faceVerified && (
            <div className="camera-wrap mb-3" style={{ maxHeight: 260 }}>
              <video ref={videoRef} autoPlay playsInline muted style={{ display: faceState !== 'idle' && faceState !== 'error' ? 'block' : 'none', transform: 'scaleX(-1)' }} className="w-full h-full object-cover" />
              <canvas ref={overlayRef} className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }} />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              {(faceState === 'idle' || faceState === 'error') && (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-6" style={{ minHeight: 180 }}>
                  <span className="text-4xl">🤖</span>
                  <p className="text-text-3 text-xs text-center">Click start to begin face verification</p>
                </div>
              )}
              {faceState !== 'idle' && faceState !== 'error' && <div className="camera-ring" />}
            </div>
          )}

          {faceVerified && capturedPhoto && (
            <div className="mb-3 relative rounded-2xl overflow-hidden" style={{ maxHeight: 200 }}>
              <img src={capturedPhoto} alt="Verified face" className="w-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.2)' }}>
                <div className="text-center">
                  <div className="text-4xl mb-1">✅</div>
                  <div className="text-emerald-400 font-bold text-sm">Face Matched</div>
                  <div className="text-emerald-300/70 text-xs">{Math.round(faceConfidence * 100)}% confidence</div>
                </div>
              </div>
            </div>
          )}

          {(faceState === 'detecting' || faceState === 'scanning') && (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-text-2 mb-1">
                <span>{faceState === 'detecting' ? `Hold still... ${Math.round(faceConfidence * 100)}% match` : 'Position your face...'}</span>
                <span>{Math.round(faceProgress)}%</span>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div className="h-full rounded-full transition-all duration-100" style={{ width: `${faceProgress}%`, background: faceConfidence > 0.6 ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(90deg,#f43f5e,#fb7185)' }} />
              </div>
            </div>
          )}

          {!faceVerified && (
            <button className={`btn btn-full ${faceState !== 'idle' && faceState !== 'error' ? 'btn-ghost' : 'btn-cyan'}`}
                    onClick={faceState !== 'idle' && faceState !== 'error' ? undefined : startFaceVerification}
                    disabled={!faceApiLoaded || faceState === 'loading'}>
              {faceState === 'loading' ? <><div className="spinner spinner-white w-4 h-4 border-2" /> Starting camera...</> :
               faceState === 'scanning' || faceState === 'detecting' ? '🔄 Verifying...' :
               faceState === 'error' ? '↺ Retry' : '🤖 Start Face Scan'}
            </button>
          )}
        </div>

        {/* Conditions Checklist */}
        <div className="glass-card p-4 mb-5 space-y-2">
          {[
            { id: 'time', met: inWindow, label: 'Within attendance window', sub: collegeSettings ? `${collegeSettings.windowStart}–${collegeSettings.windowEnd} IST` : 'Loading...' },
            { id: 'gps',  met: onCampus, label: 'Inside campus boundary', sub: gpsData ? `${Math.round(gpsData.distance)}m from campus` : 'Not checked yet' },
            { id: 'face', met: faceVerified, label: 'Face identity verified', sub: faceVerified ? `${Math.round(faceConfidence * 100)}% match confidence` : 'Not verified yet' },
          ].map(c => (
            <div key={c.id} className="cond-item" data-met={c.met ? 'true' : 'false'}>
              <span className="cond-icon">{c.met ? '✅' : '⭕'}</span>
              <div><div className="cond-label">{c.label}</div><div className="cond-sub">{c.sub}</div></div>
            </div>
          ))}
        </div>

        {/* Submit */}
        <button className="btn btn-primary btn-xl btn-full" disabled={!allMet || submitting} onClick={submitAttendance}>
          {submitting ? <><div className="spinner spinner-white w-5 h-5 border-2" /> Submitting...</> : '🚀 Mark My Attendance'}
        </button>
        {!allMet && <p className="text-center text-text-3 text-xs mt-3">Complete all three steps above to mark attendance</p>}
      </div>
    </div>
  );
}
