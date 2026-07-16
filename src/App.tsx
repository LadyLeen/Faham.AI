import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, LogIn, UserPlus, ShieldAlert, Award, FileText, CheckCircle2, 
  Clock, AlertTriangle, ArrowRight, ArrowLeft, Send, CheckCircle, XCircle, Search, HelpCircle, User, X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import Header from './components/Header';
import StudentPortal from './components/StudentPortal';
import AdminPortal from './components/AdminPortal';
import CertificateView from './components/CertificateView';
import { User as UserType, StudentProfile, Training, Question, SanitizedQuestion, QuizAttempt, AdminStats, ParticipantRegistration } from './types';

export default function App() {
  // Global States
  const [token, setToken] = useState<string | null>(localStorage.getItem('fahamai_token'));
  const [user, setUser] = useState<UserType | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(localStorage.getItem('fahamai_theme') === 'dark');

  // Navigation / Tab state
  // Can be: 'home' (Landing page / login / verify), 'student-dashboard', 'admin-dashboard', 'quiz-run', 'quiz-result', 'verify-cert'
  const [tab, setTab] = useState<string>('home');

  // Available trainings list
  const [trainings, setTrainings] = useState<Training[]>([]);
  // Student history list
  const [studentHistory, setStudentHistory] = useState<any[]>([]);
  // Admin stats state
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [adminAuditLogs, setAdminAuditLogs] = useState<any[]>([]);

  // Login & Register Form State
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regStudentId, setRegStudentId] = useState('');
  const [regOrganization, setRegOrganization] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Quiz Runtime States
  const [activeQuizTraining, setActiveQuizTraining] = useState<Training | null>(null);
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<SanitizedQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [quizTimeLeft, setQuizTimeLeft] = useState<number>(0); // in seconds
  const [quizExpired, setQuizExpired] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Quiz Result States
  const [activeResultId, setActiveResultId] = useState<string | null>(null);
  const [detailedResult, setDetailedResult] = useState<any | null>(null);
  const [loadingResult, setLoadingResult] = useState(false);

  // Certificate Public Verification States
  const [searchCertNumber, setSearchCertNumber] = useState('');
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [verificationError, setVerificationError] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Theme Management Effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('fahamai_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('fahamai_theme', 'light');
    }
  }, [darkMode]);

  // Authenticate user on mount if token is stored
  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    } else {
      // Check if there is a certificate verification parameter in the URL
      const params = new URLSearchParams(window.location.search);
      const verifyCode = params.get('verify');
      if (verifyCode) {
        setSearchCertNumber(verifyCode);
        handleVerifyCertificate(verifyCode);
      }
    }
  }, [token]);

  // Sync Timer for Active Quiz
  useEffect(() => {
    if (tab === 'quiz-run' && quizTimeLeft > 0 && !quizExpired) {
      timerRef.current = setInterval(() => {
        setQuizTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setQuizExpired(true);
            handleForceSubmitQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [tab, quizTimeLeft, quizExpired]);

  // Check verification parameter from URL on tab transitions
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifyCode = params.get('verify');
    if (verifyCode && tab !== 'verify-cert') {
      setSearchCertNumber(verifyCode);
      handleVerifyCertificate(verifyCode);
    }
  }, [tab]);

  // ==========================================
  // BACKEND API SERVICE LAYER
  // ==========================================

  const getHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me', { headers: getHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUser(data.user);
      setProfile(data.profile);
      
      // Navigate to correct portal based on role
      if (data.user.role === 'admin') {
        setTab('admin-dashboard');
      } else {
        setTab('student-dashboard');
        fetchStudentTrainings();
        fetchStudentHistory();
      }
    } catch (err) {
      // Token expired or invalid
      handleLogout();
    }
  };

  const fetchStudentTrainings = async () => {
    try {
      const res = await fetch('/api/trainings', { headers: getHeaders() });
      if (res.ok) {
        const list = await res.json();
        setTrainings(list);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStudentHistory = async () => {
    try {
      const res = await fetch('/api/students/history', { headers: getHeaders() });
      if (res.ok) {
        const hist = await res.json();
        setStudentHistory(hist);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdminStats = async (year?: string) => {
    try {
      const url = year && year !== 'all' ? `/api/admin/stats?year=${year}` : '/api/admin/stats';
      const res = await fetch(url, { headers: getHeaders() });
      if (res.ok) {
        const stats = await res.json();
        setAdminStats(stats);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdminAuditLogs = async () => {
    try {
      const res = await fetch('/api/admin/audit-logs', { headers: getHeaders() });
      if (res.ok) {
        const logs = await res.json();
        setAdminAuditLogs(logs);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================
  // AUTHENTICATION HANDLERS
  // ==========================================

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setAuthLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Log masuk gagal.');

      localStorage.setItem('fahamai_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setProfile(data.profile);

      setAuthSuccess('Log masuk berjaya! Membuka portal anda...');

      // Redirect accordingly
      setTimeout(() => {
        if (data.user.role === 'admin') {
          setTab('admin-dashboard');
          fetchAdminStats();
          fetchAdminAuditLogs();
        } else {
          setTab('student-dashboard');
          fetchStudentTrainings();
          fetchStudentHistory();
        }
      }, 1000);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setAuthLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: regEmail,
          password: regPassword,
          fullName: regFullName,
          studentId: regStudentId,
          organization: regOrganization
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Pendaftaran akaun gagal.');

      localStorage.setItem('fahamai_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setProfile(data.profile);

      setAuthSuccess('Akaun anda berjaya dicipta! Membuka portal pelajar...');
      setTimeout(() => {
        setTab('student-dashboard');
        fetchStudentTrainings();
        fetchStudentHistory();
      }, 1000);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('fahamai_token');
    setToken(null);
    setUser(null);
    setProfile(null);
    setTab('home');
    setLoginEmail('');
    setLoginPassword('');
    setRegEmail('');
    setRegPassword('');
    setRegFullName('');
    setRegStudentId('');
    setRegOrganization('');
    setAuthError('');
    setAuthSuccess('');
  };

  // Helper profile update
  const handleUpdateProfile = async (data: { fullName: string; studentId: string; organization: string }) => {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    const response = await res.json();
    if (!res.ok) throw new Error(response.error || 'Gagal kemas kini profil.');
    setProfile(response.profile);
  };

  // ==========================================
  // STUDENT WORKFLOWS (TRAINING & RUNTIME QUIZ)
  // ==========================================

  const handleRegisterTraining = async (trainingId: string) => {
    try {
      const res = await fetch(`/api/trainings/${trainingId}/register`, {
        method: 'POST',
        headers: getHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert('Berjaya mendaftar untuk modul latihan ini!');
      fetchStudentTrainings();
      fetchStudentHistory();
    } catch (err: any) {
      alert(err.message || 'Pendaftaran gagal.');
    }
  };

  const handleStartQuiz = async (trainingId: string) => {
    setQuizLoading(true);
    setQuizExpired(false);
    try {
      // 1. Trigger start attempt on backend
      const resStart = await fetch(`/api/quizzes/${trainingId}/start`, {
        method: 'POST',
        headers: getHeaders()
      });
      const dataStart = await resStart.json();
      if (!resStart.ok) throw new Error(dataStart.error);

      const attemptId = dataStart.attemptId;

      // 2. Fetch sanitized questions
      const resQ = await fetch(`/api/quizzes/${trainingId}/questions`, {
        headers: getHeaders()
      });
      const dataQ = await resQ.json();
      if (!resQ.ok) throw new Error(dataQ.error);

      // Find the training object
      const tr = trainings.find(t => t.id === trainingId) || null;

      setActiveQuizTraining(tr);
      setActiveAttemptId(attemptId);
      setQuizQuestions(dataQ.questions);
      setCurrentQIndex(0);

      // Set countdown timer
      const startTime = new Date(dataQ.startTime).getTime();
      const elapsedSec = Math.round((new Date().getTime() - startTime) / 1000);
      const remainingSec = Math.max(0, (dataQ.durationMinutes * 60) - elapsedSec);

      setQuizTimeLeft(remainingSec);
      setTab('quiz-run');
    } catch (err: any) {
      alert(err.message || 'Gagal memulakan kuiz.');
    } finally {
      setQuizLoading(false);
    }
  };

  const handleAnswerQuestion = async (questionId: string, selectedOption: 'A' | 'B' | 'C' | 'D') => {
    // Optimistic frontend state update
    const updated = [...quizQuestions];
    updated[currentQIndex] = { ...updated[currentQIndex], selectedAnswer: selectedOption };
    setQuizQuestions(updated);

    // Auto-save silently to backend server
    try {
      await fetch(`/api/quizzes/attempts/${activeAttemptId}/answer`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ questionId, selectedOption })
      });
    } catch (err) {
      console.error('Auto-save failed:', err);
    }
  };

  const handleSubmitQuiz = async () => {
    setShowSubmitModal(true);
  };

  const handleForceSubmitQuiz = () => {
    alert('Masa menjawab kuiz telah tamat! Jawapan anda dihantar secara automatik.');
    executeSubmitQuiz();
  };

  const executeSubmitQuiz = async () => {
    setQuizSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const res = await fetch(`/api/quizzes/attempts/${activeAttemptId}/submit`, {
        method: 'POST',
        headers: getHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Trigger Confetti Celebration if passed!
      if (data.result.passed) {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
      }

      // Load detailed results
      handleViewResult(activeAttemptId!);
    } catch (err: any) {
      alert(err.message || 'Gagal menghantar kuiz.');
    } finally {
      setQuizSubmitting(false);
    }
  };

  const handleViewResult = async (attemptId: string) => {
    setLoadingResult(true);
    setTab('quiz-result');
    setActiveResultId(attemptId);
    try {
      const res = await fetch(`/api/quizzes/attempts/${attemptId}/result`, {
        headers: getHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setDetailedResult(data);
    } catch (err: any) {
      alert(err.message || 'Gagal memuatkan keputusan.');
    } finally {
      setLoadingResult(false);
    }
  };

  // ==========================================
  // PUBLIC CERTIFICATE VERIFICATION FLOW
  // ==========================================

  const handleVerifyCertificate = async (codeStr?: string) => {
    const certCode = codeStr || searchCertNumber;
    if (!certCode || certCode.trim() === '') {
      setVerificationError('Sila masukkan nombor sijil yang sah.');
      return;
    }

    setVerifying(true);
    setVerificationError('');
    setVerificationResult(null);
    setTab('verify-cert');

    try {
      const res = await fetch(`/api/certificates/verify/${certCode.trim()}`);
      const data = await res.json();

      if (!res.ok) {
        setVerificationError(data.error || 'Sijil digital tidak ditemui.');
      } else {
        setVerificationResult(data);
        // Sync url param dynamically
        window.history.pushState({}, '', `/?verify=${certCode.trim()}`);
      }
    } catch (err) {
      setVerificationError('Ralat rangkaian. Sila cuba lagi.');
    } finally {
      setVerifying(false);
    }
  };

  // Helper clear verify URL
  const handleClearVerification = () => {
    setVerificationResult(null);
    setVerificationError('');
    setSearchCertNumber('');
    setTab('home');
    window.history.pushState({}, '', '/');
  };

  // ==========================================
  // ADMIN API CALL PROXIES FOR PORTAL
  // ==========================================

  const handleAdminCreateTraining = async (data: Partial<Training>) => {
    const res = await fetch('/api/trainings', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error);
    await fetchStudentTrainings(); // Refresh parent training list
  };

  const handleAdminUpdateTraining = async (id: string, data: Partial<Training>) => {
    const res = await fetch(`/api/trainings/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error);
    await fetchStudentTrainings(); // Refresh parent training list
  };

  const handleAdminUploadDocx = async (trainingId: string, filename: string, fileData: string) => {
    const res = await fetch(`/api/admin/trainings/${trainingId}/upload-docx`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ filename, fileData })
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error);
    return resData;
  };

  const handleAdminSaveQuestions = async (trainingId: string, questions: any[]) => {
    const res = await fetch(`/api/admin/trainings/${trainingId}/save-questions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ questions })
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error);
  };

  const handleAdminGetQuestions = async (trainingId: string) => {
    const res = await fetch(`/api/admin/trainings/${trainingId}/questions`, {
      headers: getHeaders()
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error);
    return resData;
  };

  const handleAdminGetParticipants = async (trainingId: string) => {
    const res = await fetch(`/api/admin/trainings/${trainingId}/registrations`, {
      headers: getHeaders()
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error);
    return resData.participants;
  };

  // Pre-fills for test evaluation
  const handlePrefillCredentials = (role: 'admin' | 'student') => {
    if (role === 'admin') {
      setLoginEmail('admin@fahamai.com');
      setLoginPassword('admin123');
    } else {
      setLoginEmail('pelajar@fahamai.com');
      setLoginPassword('pelajar123');
    }
    setAuthTab('login');
  };

  return (
    <div className="min-h-screen bg-slate-50/10 text-slate-900 transition-colors duration-200 dark:bg-transparent dark:text-slate-100 flex flex-col justify-between relative">
      <div className="mesh-bg" />
      
      {/* 1. Header Component */}
      <Header 
        user={user} 
        onLogout={handleLogout} 
        darkMode={darkMode} 
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onNavigateToProfile={() => setTab('student-dashboard')}
        currentTab={tab}
        onSetTab={setTab}
      />

      <main className="flex-grow">
        {/* ==========================================
            SCREEN 1: LANDING PAGE (tab === 'home')
            ========================================== */}
        {tab === 'home' && !token && (
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center animate-fade-in no-print">
            
            {/* Left Col: Decorative and Public Verification */}
            <div className="lg:col-span-7 space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 dark:bg-indigo-950/40 px-3.5 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/30">
                  <span>🚀 FahamAI: Sistem Penilaian Latihan Pintar</span>
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
                  Uji Kefahaman Anda <br />
                  <span className="bg-gradient-to-r from-cyan-600 to-indigo-600 bg-clip-text text-transparent dark:from-cyan-400 dark:to-indigo-400">
                    Dengan Pensijilan Pantas
                  </span>
                </h1>
                <p className="text-sm sm:text-base text-slate-500 max-w-xl leading-relaxed">
                  Platform penilaian pintar untuk menilai pemahaman peserta selepas latihan. Log masuk atau daftar latihan anda, jawab set soalan kuiz secara atas talian, dan jana sijil pencapaian digital disahkan serta-merta!
                </p>
              </div>

              {/* Public Certificate Verification Form */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg max-w-lg space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Semak Kebenaran Sijil Digital</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Sila masukkan nombor serial sijil untuk menyemak ketulenan maklumat pengeluaran.</p>
                </div>
                <div className="flex gap-2.5">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchCertNumber}
                      onChange={(e) => setSearchCertNumber(e.target.value)}
                      placeholder="cth: FahamAI-20260714-0001"
                      className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 pl-10 pr-4 py-3 text-xs sm:text-sm font-mono outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                    />
                  </div>
                  <button
                    onClick={() => handleVerifyCertificate()}
                    className="rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white px-5 py-3 text-xs font-bold text-white transition-all shadow-md cursor-pointer"
                  >
                    Sahkan Sijil
                  </button>
                </div>
              </div>
            </div>

            {/* Right Col: Interactive Login / Register Component */}
            <div className="lg:col-span-5">
              <div className="glass-card rounded-2xl border border-slate-200/50 dark:border-slate-800/30 p-6 sm:p-8 space-y-6">
                
                {/* Form Navigation tabs */}
                <div className="flex border-b border-slate-100 dark:border-slate-800 pb-3 gap-4">
                  <button
                    onClick={() => { setAuthTab('login'); setAuthError(''); setAuthSuccess(''); }}
                    className={`pb-1 text-sm font-bold transition-all border-b-2 ${
                      authTab === 'login'
                        ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Log Masuk
                  </button>
                  <button
                    onClick={() => { setAuthTab('register'); setAuthError(''); setAuthSuccess(''); }}
                    className={`pb-1 text-sm font-bold transition-all border-b-2 ${
                      authTab === 'register'
                        ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Daftar Pelajar Baru
                  </button>
                </div>

                {/* Quick Testing Pre-fills (Required for sandbox testings) */}
                <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-150 dark:border-slate-800/80">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">Penilaian Pantas Sandbox</span>
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => handlePrefillCredentials('student')} 
                      className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors cursor-pointer"
                    >
                      Prefill Ak. Pelajar
                    </button>
                    <button 
                      onClick={() => handlePrefillCredentials('admin')} 
                      className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-red-100 hover:bg-red-100 transition-colors cursor-pointer"
                    >
                      Prefill Ak. Admin
                    </button>
                  </div>
                </div>

                {/* Messaging Boxes */}
                {authError && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-800 dark:bg-red-950/20 dark:border-red-900/40 dark:text-red-400 text-xs font-semibold">
                    {authError}
                  </div>
                )}
                {authSuccess && (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-400 text-xs font-semibold">
                    {authSuccess}
                  </div>
                )}

                {/* Forms Render */}
                {authTab === 'login' ? (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Alamat E-mel</label>
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="cth: pelajar@fahamai.com"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 px-4 py-3 text-xs sm:text-sm outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Kata Laluan</label>
                      <input
                        type="password"
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 px-4 py-3 text-xs sm:text-sm outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 px-4 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
                    >
                      {authLoading ? 'Sila Tunggu...' : 'Masuk Portal'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Nama Penuh Pelajar</label>
                      <input
                        type="text"
                        required
                        value={regFullName}
                        onChange={(e) => setRegFullName(e.target.value)}
                        placeholder="cth: Ahmad Faiz bin Roslan"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 px-3.5 py-2.5 text-xs outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">ID / No. KP</label>
                        <input
                          type="text"
                          required
                          value={regStudentId}
                          onChange={(e) => setRegStudentId(e.target.value)}
                          placeholder="cth: ST-991204"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 px-3.5 py-2.5 text-xs outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">E-mel Peribadi</label>
                        <input
                          type="email"
                          required
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="cth: faiz@gmail.com"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 px-3.5 py-2.5 text-xs outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Organisasi / Syarikat / Universiti</label>
                      <input
                        type="text"
                        required
                        value={regOrganization}
                        onChange={(e) => setRegOrganization(e.target.value)}
                        placeholder="cth: Universiti Teknologi Malaysia"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 px-3.5 py-2.5 text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Kata Laluan Baru</label>
                      <input
                        type="password"
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Min. 6 aksara"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 px-3.5 py-2.5 text-xs outline-none focus:border-indigo-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 px-4 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
                    >
                      {authLoading ? 'Sila Tunggu...' : 'Daftar Akaun'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            SCREEN 2: STUDENT PORTAL (tab === 'student-dashboard')
            ========================================== */}
        {tab === 'student-dashboard' && user?.role === 'student' && (
          <StudentPortal 
            trainings={trainings}
            profile={profile}
            onRegisterTraining={handleRegisterTraining}
            onStartQuiz={handleStartQuiz}
            onUpdateProfile={handleUpdateProfile}
            onViewResult={handleViewResult}
            history={studentHistory}
            onRefresh={() => { fetchStudentTrainings(); fetchStudentHistory(); }}
          />
        )}

        {/* ==========================================
            SCREEN 3: ADMIN PORTAL (tab === 'admin-dashboard')
            ========================================== */}
        {tab === 'admin-dashboard' && user?.role === 'admin' && (
          <AdminPortal 
            trainings={trainings}
            stats={adminStats}
            onRefreshStats={fetchAdminStats}
            onCreateTraining={handleAdminCreateTraining}
            onUpdateTraining={handleAdminUpdateTraining}
            onUploadDocx={handleAdminUploadDocx}
            onSaveQuestions={handleAdminSaveQuestions}
            onGetTrainingQuestions={handleAdminGetQuestions}
            onGetParticipantsList={handleAdminGetParticipants}
            auditLogs={adminAuditLogs}
            onRefreshAuditLogs={fetchAdminAuditLogs}
            onViewResult={handleViewResult}
          />
        )}

        {/* ==========================================
            SCREEN 4: QUIZ RUNTIME SCREEN (tab === 'quiz-run')
            ========================================== */}
        {tab === 'quiz-run' && activeQuizTraining && (
          <div className="w-full max-w-4xl mx-auto px-4 py-8 animate-fade-in no-print">
            
            {/* Quiz Heading & Timer floating card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  Kuiz Aktif • Percubaan {quizQuestions[0] ? (quizQuestions as any).attemptNumber || 1 : 1}
                </span>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{activeQuizTraining.name}</h2>
              </div>

              {/* Real-time countdown clock */}
              <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 font-mono text-sm font-bold border shrink-0 ${
                quizTimeLeft <= 60 
                  ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/20 dark:border-red-900/40 animate-pulse' 
                  : 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-900/40'
              }`}>
                <Clock className="h-4 w-4" />
                <span>Baki Masa: {Math.floor(quizTimeLeft / 60)}:{(quizTimeLeft % 60).toString().padStart(2, '0')}</span>
              </div>
            </div>

            {/* Quiz progress bar */}
            <div className="w-full bg-slate-200 dark:bg-slate-850 h-2 rounded-full mb-8 overflow-hidden">
              <div 
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${((currentQIndex + 1) / quizQuestions.length) * 100}%` }}
              />
            </div>

            {/* Active Question Box */}
            {quizQuestions.length > 0 && (
              <div className="space-y-6">
                <div className="glass-card rounded-2xl border border-slate-200/50 dark:border-slate-800/30 p-6 sm:p-8">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Soalan {currentQIndex + 1} daripada {quizQuestions.length}</span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200 leading-relaxed mb-6">
                    {quizQuestions[currentQIndex].questionText}
                  </h3>

                  {/* Multiple choices */}
                  <div className="grid grid-cols-1 gap-3.5">
                    {quizQuestions[currentQIndex].options.map((opt) => {
                      const isSelected = quizQuestions[currentQIndex].selectedAnswer === opt.key;
                      return (
                        <button
                          key={opt.key}
                          onClick={() => handleAnswerQuestion(quizQuestions[currentQIndex].id, opt.key)}
                          className={`flex items-center text-left w-full rounded-xl border p-4 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/10'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span className={`h-6 w-6 rounded-full flex items-center justify-center font-bold mr-3.5 shrink-0 ${
                            isSelected 
                              ? 'bg-white/20 text-white' 
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {opt.key}
                          </span>
                          <span className="flex-1">{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Question switcher bar */}
                <div className="flex justify-between items-center gap-4">
                  <button
                    onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentQIndex === 0}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 bg-white dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" /> Soalan Sebelumnya
                  </button>

                  <div className="flex gap-2">
                    {currentQIndex < quizQuestions.length - 1 ? (
                      <button
                        onClick={() => setCurrentQIndex(prev => Math.min(quizQuestions.length - 1, prev + 1))}
                        className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 shadow-md shadow-indigo-500/10 cursor-pointer"
                      >
                        Berikutnya <ArrowRight className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={handleSubmitQuiz}
                        disabled={quizSubmitting}
                        className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 shadow-md shadow-emerald-500/10 cursor-pointer"
                      >
                        <Send className="h-4 w-4" /> {quizSubmitting ? 'Menghantar...' : 'Hantar Jawapan'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Question bubble navigation matrix */}
                <div className="glass-card rounded-2xl border border-slate-200/50 dark:border-slate-800/30 p-5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Matrik Soalan</span>
                  <div className="flex flex-wrap gap-2">
                    {quizQuestions.map((q, idx) => {
                      const isActive = currentQIndex === idx;
                      const isAnswered = q.selectedAnswer !== null;

                      return (
                        <button
                          key={q.id}
                          onClick={() => setCurrentQIndex(idx)}
                          className={`h-8 w-8 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                            isActive
                              ? 'ring-2 ring-indigo-500 bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                              : isAnswered
                                ? 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            SCREEN 5: QUIZ RESULTS & CERTIFICATE VIEW (tab === 'quiz-result')
            ========================================== */}
        {tab === 'quiz-result' && (
          <div className="w-full max-w-5xl mx-auto px-4 py-8 animate-fade-in">
            {loadingResult ? (
              <div className="text-center py-24 text-sm text-slate-400 no-print">Memuatkan laporan kuiz anda...</div>
            ) : detailedResult ? (
              <div className="space-y-10">
                
                {/* Visual scorecard */}
                <div className="glass-card rounded-2xl border border-slate-200/50 dark:border-slate-800/30 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 no-print">
                  <div className="space-y-2 text-center md:text-left">
                    <span className="inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 uppercase tracking-wider">Laporan Keputusan Rasmi</span>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">{detailedResult.training?.name}</h2>
                    <p className="text-xs text-slate-500">
                      Peserta: <span className="font-bold text-slate-800 dark:text-slate-200">{detailedResult.student?.fullName}</span> | {detailedResult.student?.organization}
                    </p>
                    <p className="text-xs text-slate-400 font-mono">ID Sesi: {detailedResult.attempt?.id}</p>
                  </div>

                  {/* Circular Score display or Status Icon */}
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Markah Anda</span>
                      <span className="text-5xl font-black text-indigo-600 dark:text-indigo-400">{detailedResult.attempt?.score}%</span>
                      <span className="text-xs text-slate-500 mt-1 block">Lulus: {detailedResult.training?.passingScore}%</span>
                    </div>

                    <div className="h-12 w-[1px] bg-slate-200 dark:bg-slate-800" />

                    <div className="text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Status Akhir</span>
                      {detailedResult.attempt?.passed ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 px-3 py-1 text-sm font-bold mt-1 shadow-sm">
                          <CheckCircle2 className="h-4 w-4" /> LULUS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 px-3 py-1 text-sm font-bold mt-1 shadow-sm">
                          <AlertTriangle className="h-4 w-4 animate-bounce" /> GAGAL
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Digital Certificate Render */}
                {detailedResult.attempt?.passed && (
                  <CertificateView 
                    studentName={detailedResult.student?.fullName}
                    studentId={detailedResult.student?.studentId}
                    organization={detailedResult.student?.organization}
                    trainingName={detailedResult.training?.name}
                    issueDate={detailedResult.attempt?.endTime}
                    certNumber={detailedResult.certNumber}
                    score={detailedResult.attempt?.score}
                    organizer={detailedResult.training?.organizer}
                    trainer={detailedResult.training?.trainer}
                  />
                )}

                {/* Score breakdown stats review */}
                <div className="glass-card rounded-2xl border border-slate-200/50 dark:border-slate-800/30 p-6 space-y-4 no-print">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Ringkasan Prestasi Jawapan</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Betul</span>
                      <span className="text-xl font-bold text-emerald-600 mt-1 block">{detailedResult.attempt?.correctAnswers} soalan</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Salah</span>
                      <span className="text-xl font-bold text-red-600 mt-1 block">{detailedResult.attempt?.totalQuestions - detailedResult.attempt?.correctAnswers} soalan</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Jumlah Soalan</span>
                      <span className="text-xl font-bold text-indigo-600 mt-1 block">{detailedResult.attempt?.totalQuestions} soalan</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Masa Digunakan</span>
                      <span className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-1 block">
                        {Math.floor((detailedResult.attempt?.durationSeconds || 0) / 60)}m {detailedResult.attempt?.durationSeconds % 60}s
                      </span>
                    </div>
                  </div>
                </div>

                {/* Detailed Questions Review List */}
                <div className="glass-card rounded-2xl border border-slate-200/50 dark:border-slate-800/30 p-6 space-y-6 no-print">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Semakan Pembelajaran Kuiz</h3>
                    <p className="text-xs text-slate-500">Sila semak semula soalan dan fahami kesilapan untuk meningkatkan kefahaman topik latihan.</p>
                  </div>

                  <div className="space-y-6">
                    {detailedResult.review?.map((rev: any, idx: number) => {
                      return (
                        <div key={rev.id} className={`p-5 rounded-xl border ${
                          rev.isCorrect 
                            ? 'border-emerald-100 bg-emerald-50/10 dark:border-emerald-950/20' 
                            : 'border-red-100 bg-red-50/10 dark:border-red-950/20'
                        }`}>
                          <div className="flex items-start gap-2.5 mb-4">
                            <span className={`h-5 w-5 font-bold rounded flex items-center justify-center shrink-0 mt-0.5 text-xs ${
                              rev.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}>{idx + 1}</span>
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">{rev.questionText}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-7">
                            {rev.options.map((opt: any) => {
                              const isSelected = rev.selectedAnswer === opt.key;
                              const isCorrectAnswer = rev.correctAnswer === opt.key;

                              return (
                                <div 
                                  key={opt.key}
                                  className={`p-3 rounded-lg border text-xs sm:text-sm flex items-center ${
                                    isCorrectAnswer
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-400 font-bold'
                                      : isSelected
                                        ? 'bg-red-50 border-red-300 text-red-900 dark:bg-red-950/20 dark:border-red-900/40 dark:text-red-400'
                                        : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400'
                                  }`}
                                >
                                  <span className={`h-5 w-5 rounded-full flex items-center justify-center font-bold mr-2 text-[10px] ${
                                    isCorrectAnswer
                                      ? 'bg-emerald-600 text-white'
                                      : isSelected
                                        ? 'bg-red-600 text-white'
                                        : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                                  }`}>
                                    {opt.key}
                                  </span>
                                  <span>{opt.text}</span>
                                </div>
                              );
                            })}
                          </div>

                          <div className="pl-7 mt-3 flex flex-wrap gap-2 text-[10px] font-bold">
                            {rev.isCorrect ? (
                              <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Betul</span>
                            ) : (
                              <>
                                <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Jawapan Anda: {rev.selectedAnswer || 'Tiada Jawab'}</span>
                                <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Jawapan Betul: {rev.correctAnswer}</span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Back button */}
                <div className="flex justify-start no-print">
                  <button
                    onClick={() => {
                      if (user?.role === 'admin') {
                        setTab('admin-dashboard');
                      } else {
                        setTab('student-dashboard');
                        fetchStudentTrainings();
                        fetchStudentHistory();
                      }
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 px-5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" /> Kembali Ke Portal Utama
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* ==========================================
            SCREEN 6: PUBLIC VERIFY CERTIFICATE SCREEN (tab === 'verify-cert')
            ========================================== */}
        {tab === 'verify-cert' && (
          <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:py-12 animate-fade-in no-print">
            
            {/* Search Header box */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4 mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">Semakan Pengesahan Sijil Pintar</h2>
                  <p className="text-xs text-slate-500">Carian masa nyata ketulenan sijil pencapaian digital yang dikeluarkan di bawah sistem FahamAI.</p>
                </div>
                <button
                  onClick={handleClearVerification}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-500"
                >
                  Batal & Kembali
                </button>
              </div>

              <div className="flex gap-2.5">
                <input
                  type="text"
                  value={searchCertNumber}
                  onChange={(e) => setSearchCertNumber(e.target.value)}
                  placeholder="Masukkan Nombor Sijil Digital"
                  className="flex-1 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 text-xs sm:text-sm font-mono outline-none"
                />
                <button
                  onClick={() => handleVerifyCertificate()}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-3 text-xs font-bold text-white shadow-md shadow-indigo-500/10 cursor-pointer"
                >
                  Sahkan Semula
                </button>
              </div>
            </div>

            {/* Verification Result Cards */}
            {verifying ? (
              <div className="text-center py-12 text-xs text-slate-400">Sedang menyemak rekod sijil...</div>
            ) : verificationResult ? (
              <div className="space-y-6">
                
                {/* Genuine Badge Banner */}
                <div className="bg-emerald-500 rounded-2xl p-6 sm:p-8 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4 text-center sm:text-left">
                    <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                      <Award className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black uppercase tracking-wider">SIJIL SAH & TULEN</h3>
                      <p className="text-xs text-emerald-100 mt-1">Dikeluarkan oleh sistem FahamAI selepas peserta melepasi kuiz penilaian dengan jayanya.</p>
                    </div>
                  </div>

                  <span className="inline-flex rounded-full bg-white text-emerald-800 font-extrabold px-3 py-1.5 text-xs font-mono">
                    {verificationResult.certNumber}
                  </span>
                </div>

                {/* Verification detailed stats table */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
                  <h4 className="text-base font-bold text-slate-800 dark:text-slate-200 pb-3 border-b border-slate-100 dark:border-slate-800">
                    Maklumat Sijil Digital
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-xs sm:text-sm">
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-850">
                      <span className="text-slate-400">Nama Penerima:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{verificationResult.studentName}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-850">
                      <span className="text-slate-400">No. KP / ID Pelajar:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{verificationResult.studentId}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-850">
                      <span className="text-slate-400">Organisasi:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{verificationResult.organization}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-850">
                      <span className="text-slate-400">Tajuk Modul Latihan:</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 max-w-[200px] text-right truncate" title={verificationResult.trainingName}>{verificationResult.trainingName}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-850">
                      <span className="text-slate-400">Penganjur Utama:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{verificationResult.organizer}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-850">
                      <span className="text-slate-400">Pegawai Pengesah / Tenaga Pengajar:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{verificationResult.trainer}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-850">
                      <span className="text-slate-400">Markah Keputusan:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{verificationResult.score}% (Lulus: {verificationResult.passingScore}%)</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-850">
                      <span className="text-slate-400">Tarikh Kelulusan Sijil:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {new Date(verificationResult.issueDate).toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              verificationError && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-950 p-8 shadow-sm text-center space-y-4">
                  <XCircle className="mx-auto h-12 w-12 text-red-500" />
                  <div>
                    <h3 className="text-base font-bold text-red-600">Sijil Tidak Ditemui / Tidak Sah</h3>
                    <p className="text-xs text-slate-500 mt-1">{verificationError}</p>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </main>

      {/* Custom Submit Quiz Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="glass-card rounded-2xl border border-slate-200/50 dark:border-slate-800/30 bg-white/95 dark:bg-slate-950/95 max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <button 
              onClick={() => setShowSubmitModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center space-y-4">
              <div className="mx-auto h-14 w-14 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <HelpCircle className="h-7 w-7" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
                  Hantar Jawapan Kuiz?
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Adakah anda pasti mahu menghantar jawapan kuiz anda sekarang? Sila semak semula semua soalan sebelum membuat keputusan. Tindakan ini tidak boleh diubah.
                </p>
              </div>
            </div>

            {/* Answered / Unanswered question counts */}
            <div className="bg-slate-50 dark:bg-slate-900/55 rounded-xl p-4 border border-slate-100 dark:border-slate-800 flex justify-around text-center">
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider block font-bold">Jumlah Soalan</span>
                <span className="text-lg font-extrabold text-slate-800 dark:text-slate-200">{quizQuestions.length}</span>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-850" />
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider block font-bold">Telah Dijawab</span>
                <span className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">
                  {quizQuestions.filter(q => q.selectedAnswer !== null).length}
                </span>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-850" />
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider block font-bold">Belum Dijawab</span>
                <span className={`text-lg font-extrabold ${quizQuestions.filter(q => q.selectedAnswer === null).length > 0 ? 'text-amber-500 font-black animate-pulse' : 'text-slate-400'}`}>
                  {quizQuestions.filter(q => q.selectedAnswer === null).length}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer text-center"
              >
                Semak Semula
              </button>
              <button
                onClick={() => {
                  setShowSubmitModal(false);
                  executeSubmitQuiz();
                }}
                disabled={quizSubmitting}
                className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-3 text-xs font-bold text-white transition-all shadow-lg shadow-indigo-500/15 cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {quizSubmitting ? 'Menghantar...' : 'Ya, Hantar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-400 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p>© 2026 FahamAI. Hak Cipta Terpelihara.</p>
          <p className="text-[10px] text-slate-400 mt-1">Sistem Penilaian Kursus Pintar & Pensijilan Automatik Pintar.</p>
        </div>
      </footer>
    </div>
  );
}
