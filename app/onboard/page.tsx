'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';

interface College { _id: string; name: string; shortName: string; courses: string[]; }

type Step = 1 | 2;

export default function OnboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [colleges, setColleges] = useState<College[]>([]);
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
  const [form, setForm] = useState({ name: '', regNo: '', branch: '', semester: '', course: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: string; msg: string } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [faceApiLoaded, setFaceApiLoaded] = useState(false);
  const [faceStatus, setFaceStatus] = useState('idle');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  const showToast = (type: string, msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    if (status === 'authenticated') {
      setForm(f => ({ ...f, name: session.user?.name || '' }));
      fetch('/api/students/me').then(r => r.json()).then(d => {
        if (d.success) router.push('/');
      }).catch(() => {});
      fetch('/api/colleges').then(r => r.json()).then(d => {
        if (d.success) setColleges(d.colleges);
      });
    }
  }, [status, session, router]);

  // Load face-api.js from CDN
  useEffect(() => {
    if (step !== 2) return;
    const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/model/';
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/dist/face-api.js';
    script.onload = async () => {
      const fa = (window as unknown as Record<string, unknown>).faceapi as {
        nets: { tinyFaceDetector: { loadFromUri: (u: string) => Promise<void> };
                faceRecognitionNet: { loadFromUri: (u: string) => Promise<void> };
                faceLandmark68Net:  { loadFromUri: (u: string) => Promise<void> } };
      };
      await fa.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await fa.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      await fa.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      setFaceApiLoaded(true);
      setFaceStatus('ready');
    };
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, [step]);

  const startCamera = async () => {
    if (!faceApiLoaded) { showToast('error', 'Face AI still loading, please wait...'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setCameraActive(true);
      setFaceStatus('scanning');
    } catch {
      showToast('error', 'Camera permission denied. Please allow camera access.');
    }
  };

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  }, []);

  useEffect(() => { return () => stopCamera(); }, [stopCamera]);

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);

    const fa = (window as unknown as Record<string, unknown>).faceapi as {
      detectSingleFace: (el: HTMLVideoElement, opts: unknown) => {
        withFaceLandmarks: () => { withFaceDescriptor: () => Promise<{ descriptor: Float32Array } | null> }
      };
      TinyFaceDetectorOptions: new (o: object) => unknown;
    };

    setFaceStatus('detecting');
    const detection = await fa.detectSingleFace(video, new fa.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
      .withFaceLandmarks().withFaceDescriptor();

    if (!detection) { showToast('error', 'No face detected. Please position your face clearly.'); setFaceStatus('scanning'); return; }

    const descriptor = Array.from(detection.descriptor);
    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setFaceDescriptor(descriptor);
    setProfilePhoto(photoDataUrl);
    setCapturedPhoto(photoDataUrl);
    setFaceStatus('captured');
    stopCamera();
    showToast('success', 'Face captured successfully!');
  };

  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 2) errs.name = 'Full name is required (min 2 chars).';
    if (!form.regNo.trim() || form.regNo.trim().length < 2) errs.regNo = 'Registration number is required.';
    if (!form.branch.trim()) errs.branch = 'Branch is required.';
    if (!form.semester.trim()) errs.semester = 'Semester is required.';
    if (!form.course) errs.course = 'Please select a course.';
    if (!selectedCollege) errs.college = 'Please select your college.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!profilePhoto || !faceDescriptor) { showToast('error', 'Please capture your face photo first.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/students/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, collegeId: selectedCollege!._id, profilePhoto, faceDescriptor }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('success', 'Profile created! Redirecting...');
      setTimeout(() => router.push('/'), 1200);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to save profile.');
      setSubmitting(false);
    }
  };

  if (status === 'loading') return <div className="page-center"><div className="spinner spinner-lg" /></div>;

  return (
    <div className="relative z-10 min-h-screen py-10 px-4">
      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type} fixed bottom-6 right-6 z-50`}>
          <span className="toast-icon">{toast.type === 'success' ? '✅' : '❌'}</span>
          <div className="toast-body"><div className="toast-msg">{toast.msg}</div></div>
        </div>
      )}

      <div className="container-sm">
        {/* Header */}
        <div className="text-center mb-8">
          {session?.user?.image && <Image src={session.user.image} alt="" width={56} height={56} className="rounded-full mx-auto mb-3 ring-2 ring-accent-indigo/50" />}
          <h1 className="font-display text-2xl font-black text-white">
            Welcome, <span className="text-gradient">{session?.user?.name?.split(' ')[0]}</span>!
          </h1>
          <p className="text-text-2 text-sm mt-1">Complete your profile to start marking attendance</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2].map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= s ? 'bg-gradient-to-r from-accent-indigo to-accent-cyan' : 'bg-white/10'}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="glass-card p-6 anim-scale-in">
            <div className="text-xs text-accent-indigo font-bold uppercase tracking-widest mb-1">Step 1 of 2</div>
            <h2 className="text-xl font-bold text-white mb-5">Your Details</h2>

            <div className="space-y-4">
              {/* College Select */}
              <div>
                <label className="form-label">Your College <span className="text-rose-400">*</span></label>
                <select className="form-input" value={selectedCollege?._id || ''} onChange={e => {
                  const c = colleges.find(c => c._id === e.target.value) || null;
                  setSelectedCollege(c);
                  setForm(f => ({ ...f, course: '' }));
                }}>
                  <option value="">Select your college...</option>
                  {colleges.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
                {errors.college && <p className="form-error">{errors.college}</p>}
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="form-label">Full Name <span className="text-rose-400">*</span></label>
                  <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your full name" />
                  {errors.name && <p className="form-error">{errors.name}</p>}
                </div>
                <div>
                  <label className="form-label">Registration Number <span className="text-rose-400">*</span></label>
                  <input className="form-input" value={form.regNo} onChange={e => setForm(f => ({ ...f, regNo: e.target.value }))} placeholder="e.g. BU21CSEN0100" />
                  {errors.regNo && <p className="form-error">{errors.regNo}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Branch <span className="text-rose-400">*</span></label>
                    <input className="form-input" value={form.branch} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))} placeholder="e.g. CSE" />
                    {errors.branch && <p className="form-error">{errors.branch}</p>}
                  </div>
                  <div>
                    <label className="form-label">Semester <span className="text-rose-400">*</span></label>
                    <input className="form-input" value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))} placeholder="e.g. 5th" />
                    {errors.semester && <p className="form-error">{errors.semester}</p>}
                  </div>
                </div>
                <div>
                  <label className="form-label">Course <span className="text-rose-400">*</span></label>
                  <select className="form-input" value={form.course} onChange={e => setForm(f => ({ ...f, course: e.target.value }))}>
                    <option value="">Select course...</option>
                    {(selectedCollege?.courses || ['BTech','MCA','MBA','MSc','Other']).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {errors.course && <p className="form-error">{errors.course}</p>}
                </div>
              </div>
            </div>

            <button className="btn btn-primary btn-full btn-lg mt-6" onClick={() => { if (validateStep1()) setStep(2); }}>
              Continue → Capture Face
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="glass-card p-6 anim-scale-in">
            <div className="text-xs text-accent-indigo font-bold uppercase tracking-widest mb-1">Step 2 of 2</div>
            <h2 className="text-xl font-bold text-white mb-1">Face Registration</h2>
            <p className="text-text-2 text-sm mb-5">Your face will be used to verify identity at each attendance check.</p>

            {!faceApiLoaded && (
              <div className="flex items-center gap-3 p-4 rounded-xl mb-4" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)' }}>
                <div className="spinner" />
                <span className="text-sm text-text-2">Loading AI face detection models...</span>
              </div>
            )}

            {capturedPhoto ? (
              <div className="mb-5 relative">
                <img src={capturedPhoto} alt="Captured face" className="w-full rounded-2xl object-cover" style={{ maxHeight: 280 }} />
                <div className="absolute inset-0 rounded-2xl flex items-end p-4" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)' }}>
                  <span className="badge badge-emerald text-sm">✅ Face Captured & Verified</span>
                </div>
              </div>
            ) : (
              <div className="camera-wrap mb-4" style={{ maxHeight: 280 }}>
                <video ref={videoRef} autoPlay playsInline muted style={{ display: cameraActive ? 'block' : 'none', transform: 'scaleX(-1)' }} className="w-full h-full object-cover" />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                {!cameraActive && (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-8" style={{ minHeight: 200 }}>
                    <span className="text-5xl">📷</span>
                    <p className="text-text-2 text-sm text-center">Camera preview will appear here</p>
                  </div>
                )}
                {cameraActive && <div className="camera-ring" />}
              </div>
            )}

            <div className="flex gap-3 mb-5">
              {!cameraActive && !capturedPhoto && (
                <button className="btn btn-cyan btn-full" onClick={startCamera} disabled={!faceApiLoaded}>
                  📷 Open Camera
                </button>
              )}
              {cameraActive && (
                <button className="btn btn-emerald btn-full" onClick={capturePhoto}>
                  ✅ Capture Face
                </button>
              )}
              {capturedPhoto && (
                <button className="btn btn-ghost" onClick={() => { setCapturedPhoto(null); setProfilePhoto(null); setFaceDescriptor(null); setFaceStatus('ready'); }}>
                  ↺ Retake
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
              <button className="btn btn-primary btn-full btn-lg" disabled={!capturedPhoto || submitting} onClick={handleSubmit}>
                {submitting ? <><div className="spinner spinner-white w-4 h-4 border-2" /> Saving...</> : '🚀 Complete Setup'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
