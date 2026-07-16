import React, { useState, useEffect } from 'react';
import { 
  Users, BarChart3, ClipboardList, ShieldAlert, Plus, Edit2, Check, X, 
  Upload, FileText, CheckSquare, RefreshCw, Trash2, ArrowRight, Download, Eye, AlertCircle, Copy
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { Training, Question, AdminStats, ParticipantRegistration } from '../types';
import { exportParticipantsToCsv } from './CsvExporter';

interface AdminPortalProps {
  trainings: Training[];
  stats: AdminStats | null;
  onRefreshStats: (year?: string) => void;
  onCreateTraining: (data: Partial<Training>) => Promise<void>;
  onUpdateTraining: (id: string, data: Partial<Training>) => Promise<void>;
  onUploadDocx: (trainingId: string, filename: string, fileData: string) => Promise<{ message: string; questions: Question[] }>;
  onSaveQuestions: (trainingId: string, questions: any[]) => Promise<void>;
  onGetTrainingQuestions: (trainingId: string) => Promise<Question[]>;
  onGetParticipantsList: (trainingId: string) => Promise<ParticipantRegistration[]>;
  auditLogs: any[];
  onRefreshAuditLogs: () => void;
  onViewResult: (attemptId: string) => void;
}

export default function AdminPortal({
  trainings,
  stats,
  onRefreshStats,
  onCreateTraining,
  onUpdateTraining,
  onUploadDocx,
  onSaveQuestions,
  onGetTrainingQuestions,
  onGetParticipantsList,
  auditLogs,
  onRefreshAuditLogs,
  onViewResult,
}: AdminPortalProps) {
  const [activeSubTab, setActiveSubTab] = useState<'stats' | 'trainings' | 'questions' | 'participants' | 'logs'>('stats');
  const [selectedYear, setSelectedYear] = useState<string>('all');

  // State for trainings management
  const [isEditingTraining, setIsEditingTraining] = useState(false);
  const [isCreatingTraining, setIsCreatingTraining] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);
  const [trainingForm, setTrainingForm] = useState({
    name: '',
    description: '',
    date: '',
    location: '',
    organizer: '',
    trainer: '',
    passingScore: 80,
    durationMinutes: 15,
    maxAttempts: 3,
    randomizeQuestions: true,
    isActive: true
  });

  // State for question management
  const [selectedQTrainingId, setSelectedQTrainingId] = useState(trainings[0]?.id || '');
  const [existingQuestions, setExistingQuestions] = useState<Question[]>([]);
  const [parsedQuestions, setParsedQuestions] = useState<any[]>([]);
  const [importMessage, setImportMessage] = useState('');
  const [importError, setImportError] = useState('');
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [uploadingDocx, setUploadingDocx] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyTemplateText = () => {
    const templateText = `1. Apakah ibu negara bagi negara Malaysia?
A. George Town
B. Kuala Lumpur
C. Shah Alam
D. Johor Bahru
Jawapan: B

2. Berapakah bilangan rukun Islam?
A. Lima (5)
B. Enam (6)
C. Empat (4)
D. Tujuh (7)
Jawapan: A`;
    navigator.clipboard.writeText(templateText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // State for participants management
  const [selectedPTrainingId, setSelectedPTrainingId] = useState(trainings[0]?.id || '');
  const [participantsList, setParticipantsList] = useState<ParticipantRegistration[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  // Load stats and training-dependent states on mount or year change
  useEffect(() => {
    onRefreshStats(selectedYear);
  }, [selectedYear]);

  useEffect(() => {
    if (trainings.length > 0) {
      if (!selectedQTrainingId) setSelectedQTrainingId(trainings[0].id);
      if (!selectedPTrainingId) setSelectedPTrainingId(trainings[0].id);
    }
  }, [trainings]);

  // Load existing questions when training changes
  useEffect(() => {
    if (selectedQTrainingId && activeSubTab === 'questions') {
      loadExistingQuestions();
    }
  }, [selectedQTrainingId, activeSubTab]);

  // Load participants list when training changes
  useEffect(() => {
    if (selectedPTrainingId && activeSubTab === 'participants') {
      loadParticipants();
    }
  }, [selectedPTrainingId, activeSubTab]);

  const loadExistingQuestions = async () => {
    setLoadingQuestions(true);
    setParsedQuestions([]);
    setImportMessage('');
    setImportError('');
    try {
      const qList = await onGetTrainingQuestions(selectedQTrainingId);
      setExistingQuestions(qList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const loadParticipants = async () => {
    setLoadingParticipants(true);
    try {
      const list = await onGetParticipantsList(selectedPTrainingId);
      setParticipantsList(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingParticipants(false);
    }
  };

  // Trainings CRUD handlers
  const handleEditClick = (t: Training) => {
    setSelectedTraining(t);
    setTrainingForm({
      name: t.name,
      description: t.description,
      date: t.date,
      location: t.location,
      organizer: t.organizer,
      trainer: t.trainer,
      passingScore: t.passingScore,
      durationMinutes: t.durationMinutes,
      maxAttempts: t.maxAttempts,
      randomizeQuestions: t.randomizeQuestions,
      isActive: t.isActive
    });
    setIsEditingTraining(true);
  };

  const handleCreateClick = () => {
    setTrainingForm({
      name: '',
      description: '',
      date: new Date().toISOString().slice(0, 10),
      location: '',
      organizer: '',
      trainer: '',
      passingScore: 80,
      durationMinutes: 15,
      maxAttempts: 3,
      randomizeQuestions: true,
      isActive: true
    });
    setIsCreatingTraining(true);
  };

  const handleTrainingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isCreatingTraining) {
        await onCreateTraining(trainingForm);
        setIsCreatingTraining(false);
      } else if (isEditingTraining && selectedTraining) {
        await onUpdateTraining(selectedTraining.id, trainingForm);
        setIsEditingTraining(false);
      }
      onRefreshStats(selectedYear);
    } catch (err) {
      alert('Ralat semasa menyimpan latihan.');
    }
  };

  const handleToggleActive = async (t: Training) => {
    try {
      await onUpdateTraining(t.id, { isActive: !t.isActive });
      onRefreshStats(selectedYear);
    } catch (err) {
      alert('Gagal mengemas kini status latihan.');
    }
  };

  // DOCX Parser Upload Handler
  const handleDocxUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDocx(true);
    setImportError('');
    setImportMessage('');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const rawResult = event.target?.result as string;
        // Strip data url prefix to get raw base64 string
        const base64Data = rawResult.split(',')[1];
        
        const response = await onUploadDocx(selectedQTrainingId, file.name, base64Data);
        setParsedQuestions(response.questions);
        setImportMessage(response.message);
      } catch (err: any) {
        setImportError(err.message || 'Gagal memproses fail DOCX.');
      } finally {
        setUploadingDocx(false);
        e.target.value = ''; // Reset file input
      }
    };
    reader.readAsDataURL(file);
  };

  // Parsed Questions edit actions
  const handleUpdateParsedQuestion = (index: number, updatedField: string, value: any) => {
    const updated = [...parsedQuestions];
    updated[index] = { ...updated[index], [updatedField]: value };
    setParsedQuestions(updated);
  };

  const handleUpdateParsedOption = (qIndex: number, optIndex: number, text: string) => {
    const updated = [...parsedQuestions];
    const options = [...updated[qIndex].options];
    options[optIndex] = { ...options[optIndex], text };
    updated[qIndex] = { ...updated[qIndex], options };
    setParsedQuestions(updated);
  };

  const handleAddParsedQuestion = () => {
    const newQ = {
      questionText: 'Soalan Baru?',
      options: [
        { key: 'A', text: 'Pilihan A' },
        { key: 'B', text: 'Pilihan B' },
        { key: 'C', text: 'Pilihan C' },
        { key: 'D', text: 'Pilihan D' }
      ],
      correctAnswer: 'A'
    };
    setParsedQuestions([...parsedQuestions, newQ]);
  };

  const handleRemoveParsedQuestion = (index: number) => {
    const updated = parsedQuestions.filter((_, idx) => idx !== index);
    setParsedQuestions(updated);
  };

  const handleSaveQuestionsToDb = async () => {
    if (parsedQuestions.length === 0) return;
    try {
      await onSaveQuestions(selectedQTrainingId, parsedQuestions);
      setParsedQuestions([]);
      setImportMessage('');
      alert('Soalan berjaya disimpan ke pangkalan data!');
      loadExistingQuestions();
      onRefreshStats(selectedYear);
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan soalan.');
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in no-print">
      {/* Header and statistics tab bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Dashboard Pengurusan Admin
          </h1>
          <p className="text-sm text-slate-500">Mencipta latihan, mengimport soalan DOCX, menilai prestasi pelajar dan mengurus sijil digital.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Tapis Tahun (Year Filter) */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Tapis Tahun:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer focus:border-indigo-500 transition-colors"
            >
              <option value="all">Semua Tahun</option>
              {stats?.availableYears?.map(yr => (
                <option key={yr} value={yr}>{yr}</option>
              )) || trainings.reduce((years: string[], t) => {
                const yr = t.date ? t.date.slice(0, 4) : null;
                if (yr && !years.includes(yr)) years.push(yr);
                return years;
              }, []).sort((a, b) => b.localeCompare(a)).map(yr => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              onRefreshStats(selectedYear);
              onRefreshAuditLogs();
              if (activeSubTab === 'questions') loadExistingQuestions();
              if (activeSubTab === 'participants') loadParticipants();
            }}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 transition-all cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Segarkan Semua Data
          </button>
        </div>
      </div>

      {/* Sub tabs navigation */}
      <div className="flex flex-wrap gap-1.5 border-b border-slate-200 dark:border-slate-800 mb-8 pb-3">
        {[
          { id: 'stats', label: 'Ringkasan Analitik', icon: BarChart3 },
          { id: 'trainings', label: 'Urus Latihan', icon: ClipboardList },
          { id: 'questions', label: 'Urus Kuiz & DOCX', icon: Upload },
          { id: 'participants', label: 'Peserta & Keputusan', icon: Users },
          { id: 'logs', label: 'Log Audit', icon: ShieldAlert },
        ].map(sub => {
          const Icon = sub.icon;
          return (
            <button
              key={sub.id}
              onClick={() => setActiveSubTab(sub.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeSubTab === sub.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/15'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="h-4 w-4" /> {sub.label}
            </button>
          );
        })}
      </div>

      {/* 1. ANALYTICS STATS VIEW */}
      {activeSubTab === 'stats' && stats && (
        <div className="space-y-8">
          {/* Bento Grid Analytics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            <div className="rounded-2xl border border-slate-200/50 dark:border-slate-800/30 glass-card p-6">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Jumlah Pelajar</span>
              <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 mt-2 block">{stats.summary.totalStudents}</span>
              <p className="text-[10px] text-slate-500 mt-1">Berdaftar dalam profil</p>
            </div>
            <div className="rounded-2xl border border-slate-200/50 dark:border-slate-800/30 glass-card p-6">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Telah Menjawab</span>
              <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 mt-2 block">{stats.summary.uniqueStudentsAnswered}</span>
              <p className="text-[10px] text-slate-500 mt-1">Min. 1 percubaan selesai</p>
            </div>
            <div className="rounded-2xl border border-emerald-200/50 dark:border-emerald-900/30 bg-emerald-50/10 dark:bg-emerald-950/5 p-6 glass-card">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider block">Kadar Kelulusan</span>
              <span className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-2 block">{stats.summary.passRate}%</span>
              <p className="text-[10px] text-slate-500 mt-1">Daripada semua percubaan</p>
            </div>
            <div className="rounded-2xl border border-indigo-200/50 dark:border-indigo-900/30 bg-indigo-50/10 dark:bg-indigo-950/5 p-6 glass-card">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">Purata Markah</span>
              <span className="text-3xl font-extrabold text-indigo-700 dark:text-indigo-400 mt-2 block">{stats.summary.avgScore}%</span>
              <p className="text-[10px] text-slate-500 mt-1">Markah keseluruhan kuiz</p>
            </div>
            <div className="rounded-2xl border border-slate-200/50 dark:border-slate-800/30 glass-card p-6">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Purata Durasi</span>
              <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 mt-2 block">
                {Math.floor(stats.summary.avgDuration / 60)}m {stats.summary.avgDuration % 60}s
              </span>
              <p className="text-[10px] text-slate-500 mt-1">Masa tamat menjawab</p>
            </div>
          </div>

          {/* Process data for charts */}
          {(() => {
            const totalAttempts = stats.trainingPerformance.reduce((sum, p) => sum + p.attempts, 0);
            const totalPassed = stats.trainingPerformance.reduce((sum, p) => sum + p.passed, 0);
            const totalFailed = Math.max(0, totalAttempts - totalPassed);

            const overallPassFailData = [
              { name: 'Lulus', value: totalPassed, color: '#10b981' },
              { name: 'Gagal', value: totalFailed, color: '#f43f5e' }
            ].filter(item => item.value > 0);

            const hasChartData = totalAttempts > 0;

            const participationChartData = stats.trainingPerformance.map(p => ({
              name: p.name.length > 22 ? p.name.slice(0, 22) + '...' : p.name,
              fullName: p.name,
              'Berdaftar': p.registered,
              'Menduduki Kuiz': p.attempts,
              'Lulus': p.passed,
            }));

            const scorePerformanceChartData = stats.trainingPerformance.map(p => ({
              name: p.name.length > 22 ? p.name.slice(0, 22) + '...' : p.name,
              fullName: p.name,
              'Kadar Kelulusan (%)': p.passRate,
              'Purata Markah (%)': p.avgScore,
            }));

            return (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pie Chart: Kadar Kelulusan Keseluruhan */}
                <div className="rounded-2xl border border-slate-200/50 dark:border-slate-800/30 glass-card p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-emerald-500" /> Analisis Kelulusan Keseluruhan
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1">Nisbah percubaan kuiz yang lulus berbanding gagal bagi tahun terpilih.</p>
                  </div>
                  
                  <div className="h-64 flex items-center justify-center relative my-4">
                    {hasChartData ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={overallPassFailData}
                            cx="50%"
                            cy="50%"
                            innerRadius={65}
                            outerRadius={90}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {overallPassFailData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value) => [`${value} percubaan`, 'Jumlah']} 
                            contentStyle={{ borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center text-xs text-slate-400 p-6">Tiada rekod data kelulusan untuk tahun ini.</div>
                    )}
                    
                    {hasChartData && (
                      <div className="absolute flex flex-col items-center justify-center text-center">
                        <span className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">{stats.summary.passRate}%</span>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Kadar Lulus</span>
                      </div>
                    )}
                  </div>

                  {hasChartData ? (
                    <div className="flex justify-center gap-6 text-xs font-bold mt-2">
                      <div className="flex items-center gap-1.5 text-emerald-600">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 block" />
                        <span>Lulus ({totalPassed})</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-rose-600">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500 block" />
                        <span>Gagal ({totalFailed})</span>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Bar Chart: Statistik Penyertaan Latihan */}
                <div className="rounded-2xl border border-slate-200/50 dark:border-slate-800/30 glass-card p-6 lg:col-span-2 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
                      <Users className="h-4 w-4 text-indigo-500" /> Statistik Penyertaan Latihan
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1">Perbandingan antara jumlah peserta berdaftar, menduduki kuiz, dan lulus mengikut latihan.</p>
                  </div>

                  <div className="h-64 my-4">
                    {hasChartData ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={participationChartData}
                          margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800/50" />
                          <XAxis 
                            dataKey="name" 
                            tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis 
                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            cursor={{ fill: 'rgba(99, 102, 241, 0.03)' }}
                            contentStyle={{ borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}
                            labelFormatter={(label, items) => items[0]?.payload?.fullName || label}
                          />
                          <Legend 
                            verticalAlign="top" 
                            height={36} 
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                          />
                          <Bar dataKey="Berdaftar" fill="#818cf8" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Menduduki Kuiz" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Lulus" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400">Tiada rekod data penyertaan untuk tahun ini.</div>
                    )}
                  </div>
                </div>

                {/* Bar Chart: Prestasi Purata Markah & Kelulusan (%) */}
                <div className="rounded-2xl border border-slate-200/50 dark:border-slate-800/30 glass-card p-6 lg:col-span-3 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-violet-500" /> Prestasi Markah & Kadar Kelulusan (%)
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1">Perbandingan peratusan purata markah berbanding kadar kelulusan keseluruhan bagi setiap modul latihan.</p>
                  </div>

                  <div className="h-64 my-4">
                    {hasChartData ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={scorePerformanceChartData}
                          margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800/50" />
                          <XAxis 
                            dataKey="name" 
                            tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis 
                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                            axisLine={false}
                            tickLine={false}
                            domain={[0, 100]}
                          />
                          <Tooltip
                            cursor={{ fill: 'rgba(99, 102, 241, 0.03)' }}
                            contentStyle={{ borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}
                            labelFormatter={(label, items) => items[0]?.payload?.fullName || label}
                          />
                          <Legend 
                            verticalAlign="top" 
                            height={36} 
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                          />
                          <Bar dataKey="Purata Markah (%)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Kadar Kelulusan (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400">Tiada rekod data prestasi untuk tahun ini.</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Ranking & Performance layout split */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Top Student Rankings (Tiebreaker applied: Highest score -> fastest time) */}
            <div className="lg:col-span-2 glass-card rounded-2xl border border-slate-200/50 dark:border-slate-800/30 overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Kedudukan Pelajar Cemerlang</h3>
                <p className="text-xs text-slate-500">Kedudukan dihitung mengikut markah tertinggi. Tempoh menjawab paling singkat dijadikan pemisah (tiebreaker) jika markah sama.</p>
              </div>

              {stats.rankings.length === 0 ? (
                <div className="p-10 text-center text-xs text-slate-500">Tiada rekod keputusan dicatat buat masa ini.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800 font-bold text-slate-500 uppercase border-b border-slate-100 dark:border-slate-800">
                        <th className="p-4 w-12 text-center">Ked.</th>
                        <th className="p-4">Nama Pelajar</th>
                        <th className="p-4">Latihan</th>
                        <th className="p-4 text-center">Markah</th>
                        <th className="p-4 text-center">Masa Menjawab</th>
                        <th className="p-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {stats.rankings.slice(0, 10).map((rank, index) => {
                        const isTop3 = index < 3;
                        const medalColors = ['bg-amber-100 text-amber-800 border-amber-200', 'bg-slate-100 text-slate-800 border-slate-200', 'bg-orange-100 text-orange-800 border-orange-200'];

                        return (
                          <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                            <td className="p-4 text-center">
                              {isTop3 ? (
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold border text-[11px] ${medalColors[index]}`}>
                                  {index + 1}
                                </span>
                              ) : (
                                <span className="text-slate-500">{index + 1}</span>
                              )}
                            </td>
                            <td className="p-4">
                              <div className="font-bold text-slate-800 dark:text-slate-200">{rank.studentName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{rank.organization}</div>
                            </td>
                            <td className="p-4 text-slate-500 max-w-[150px] truncate">{rank.trainingName}</td>
                            <td className="p-4 text-center font-bold text-indigo-600 dark:text-indigo-400 text-sm">{rank.score}%</td>
                            <td className="p-4 text-center font-mono text-slate-500">
                              {Math.floor(rank.durationSeconds / 60)}m {rank.durationSeconds % 60}s
                            </td>
                            <td className="p-4 text-center">
                              {rank.passed ? (
                                <span className="inline-flex rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 font-bold">Lulus</span>
                              ) : (
                                <span className="inline-flex rounded-full bg-red-50 text-red-700 px-2 py-0.5 font-bold">Gagal</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Performance per training */}
            <div className="space-y-6">
              <div className="glass-card rounded-2xl border border-slate-200/50 dark:border-slate-800/30 p-6">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">Prestasi Mengikut Latihan</h3>
                <div className="space-y-4">
                  {stats.trainingPerformance.map(perf => (
                    <div key={perf.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                        <span className="truncate max-w-[200px]">{perf.name}</span>
                        <span>{perf.passed}/{perf.attempts} Lulus</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                        <div 
                          className="bg-indigo-600 dark:bg-indigo-400 h-2 rounded-full" 
                          style={{ width: `${perf.passRate}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Daftar: {perf.registered} peserta</span>
                        <span>Purata: {perf.avgScore}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hardest Questions */}
              <div className="glass-card rounded-2xl border border-slate-200/50 dark:border-slate-800/30 p-6">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">Soalan Paling Banyak Salah</h3>
                <p className="text-[11px] text-slate-500 mb-4">Mengenal pasti konsep yang kurang difahami oleh pelajar.</p>

                {stats.hardestQuestions.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400">Tiada salah rekod dikesan.</div>
                ) : (
                  <div className="space-y-3.5">
                    {stats.hardestQuestions.map((q, idx) => (
                      <div key={idx} className="flex gap-2.5 items-start text-xs border-b border-slate-100 dark:border-slate-800/60 pb-3 last:border-0 last:pb-0">
                        <span className="flex h-5 w-5 items-center justify-center bg-red-50 text-red-700 rounded font-bold shrink-0">{idx+1}</span>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200 line-clamp-2">{q.text}</p>
                          <span className="text-[10px] text-slate-400 block mt-0.5 truncate max-w-[220px]">{q.trainingName}</span>
                          <span className="inline-block mt-1 bg-red-50 text-red-600 font-semibold px-1.5 py-0.5 rounded text-[10px]">{q.count} kes salah jawab</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. TRAININGS MANAGEMENT VIEW */}
      {activeSubTab === 'trainings' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center glass-card rounded-2xl border border-slate-200/50 dark:border-slate-800/30 p-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Modul Latihan Aktif</h2>
              <p className="text-xs text-slate-500">Mencipta modul latihan baru, menetapkan markah lulus, dan mengurus parameter kuiz.</p>
            </div>
            <button
              onClick={handleCreateClick}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/10 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Cipta Latihan Baru
            </button>
          </div>

          {/* Form Create/Edit Modals (Inlined for simplicity and robustness) */}
          {(isCreatingTraining || isEditingTraining) && (
            <div className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-950/50 rounded-2xl p-6 shadow-xl animate-fade-in">
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-bold text-indigo-950 dark:text-indigo-400">
                  {isCreatingTraining ? 'Cipta Latihan Baru' : `Edit Latihan: ${selectedTraining?.name}`}
                </h3>
                <button
                  onClick={() => { setIsCreatingTraining(false); setIsEditingTraining(false); }}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleTrainingSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Nama Latihan</label>
                    <input
                      type="text"
                      required
                      value={trainingForm.name}
                      onChange={(e) => setTrainingForm({ ...trainingForm, name: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 px-4 py-2.5 text-xs sm:text-sm outline-none focus:border-indigo-500"
                      placeholder="cth: Bengkel Pengenalan Keselamatan Siber"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Penerangan Latihan</label>
                    <textarea
                      required
                      rows={3}
                      value={trainingForm.description}
                      onChange={(e) => setTrainingForm({ ...trainingForm, description: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 px-4 py-2.5 text-xs sm:text-sm outline-none focus:border-indigo-500"
                      placeholder="Sila nyatakan objektif, kumpulan sasaran dan kandungan modul ringkas..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Tarikh Pelaksanaan</label>
                    <input
                      type="date"
                      required
                      value={trainingForm.date}
                      onChange={(e) => setTrainingForm({ ...trainingForm, date: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 px-4 py-2.5 text-xs sm:text-sm outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Lokasi / Medium</label>
                    <input
                      type="text"
                      required
                      value={trainingForm.location}
                      onChange={(e) => setTrainingForm({ ...trainingForm, location: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 px-4 py-2.5 text-xs sm:text-sm outline-none"
                      placeholder="cth: Dewan Seminar / Google Meet"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Penganjur Utama</label>
                    <input
                      type="text"
                      required
                      value={trainingForm.organizer}
                      onChange={(e) => setTrainingForm({ ...trainingForm, organizer: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 px-4 py-2.5 text-xs sm:text-sm outline-none"
                      placeholder="cth: Jabatan IT Selangor"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Jurulatih / Pegawai Melulus</label>
                    <input
                      type="text"
                      required
                      value={trainingForm.trainer}
                      onChange={(e) => setTrainingForm({ ...trainingForm, trainer: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 px-4 py-2.5 text-xs sm:text-sm outline-none"
                      placeholder="cth: Dr. Khairul Salim"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Markah Lulus Minimum (%)</label>
                    <input
                      type="number"
                      required
                      min={10}
                      max={100}
                      value={trainingForm.passingScore}
                      onChange={(e) => setTrainingForm({ ...trainingForm, passingScore: Number(e.target.value) })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 px-4 py-2.5 text-xs sm:text-sm outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Tempoh Jawab Kuiz (Minit)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={180}
                      value={trainingForm.durationMinutes}
                      onChange={(e) => setTrainingForm({ ...trainingForm, durationMinutes: Number(e.target.value) })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 px-4 py-2.5 text-xs sm:text-sm outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Had Bilangan Percubaan</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={20}
                      value={trainingForm.maxAttempts}
                      onChange={(e) => setTrainingForm({ ...trainingForm, maxAttempts: Number(e.target.value) })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 px-4 py-2.5 text-xs sm:text-sm outline-none"
                    />
                  </div>

                  <div className="flex flex-col justify-center gap-1.5">
                    <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={trainingForm.randomizeQuestions}
                        onChange={(e) => setTrainingForm({ ...trainingForm, randomizeQuestions: e.target.checked })}
                        className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                      Randomkan Susunan Soalan Kuiz
                    </label>
                    <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={trainingForm.isActive}
                        onChange={(e) => setTrainingForm({ ...trainingForm, isActive: e.target.checked })}
                        className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                      Latihan Aktif (Boleh diakses oleh pelajar)
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => { setIsCreatingTraining(false); setIsEditingTraining(false); }}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 px-5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/10 cursor-pointer"
                  >
                    Simpan Latihan
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Trainings Grid / Table List */}
          <div className="glass-card rounded-2xl border border-slate-200/50 dark:border-slate-800/30 overflow-hidden">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 font-bold text-slate-500 uppercase border-b border-slate-100 dark:border-slate-800">
                  <th className="p-4">Nama Latihan</th>
                  <th className="p-4">Tarikh & Lokasi</th>
                  <th className="p-4">Jurulatih & Penganjur</th>
                  <th className="p-4 text-center">Had & Durasi</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {trainings.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                    <td className="p-4">
                      <div className="font-bold text-slate-800 dark:text-slate-100">{t.name}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{t.description}</div>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">
                      <div>{t.date}</div>
                      <div className="text-[11px] text-slate-400">{t.location}</div>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">
                      <div>{t.trainer}</div>
                      <div className="text-[11px] text-slate-400">{t.organizer}</div>
                    </td>
                    <td className="p-4 text-center">
                      <div>Lulus: {t.passingScore}%</div>
                      <div className="text-[11px] text-slate-400">{t.durationMinutes}m | Had {t.maxAttempts}x</div>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleToggleActive(t)}
                        className={`inline-flex rounded-full px-2.5 py-0.5 font-bold tracking-wider uppercase text-[10px] cursor-pointer ${
                          t.isActive 
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' 
                            : 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400'
                        }`}
                        title="Klik untuk tukar status aktif"
                      >
                        {t.isActive ? 'Aktif' : 'Nyahaktif'}
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleEditClick(t)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
                      >
                        <Edit2 className="h-3 w-3" /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. QUESTIONS MANAGEMENT (DOCX PARSER WITH LIVE PREVIEW & EDIT) */}
      {activeSubTab === 'questions' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Import & Pengurusan Set Soalan (.docx)</h2>
            <p className="text-xs text-slate-500 mb-6">
              Sistem menyokong import soalan objektif bermula dari fail dokumen Microsoft Word (.docx). Struktur fail perlu mempunyai pilihan A, B, C, D dan baris "Jawapan: A".
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Pilih Modul Latihan</label>
                <select
                  value={selectedQTrainingId}
                  onChange={(e) => setSelectedQTrainingId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 px-4 py-2.5 text-xs sm:text-sm outline-none"
                >
                  {trainings.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Upload input button */}
              <div className="md:col-span-2 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <input
                    type="file"
                    accept=".docx"
                    onChange={handleDocxUpload}
                    disabled={uploadingDocx || !selectedQTrainingId}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <div className="flex items-center justify-center gap-2 w-full rounded-xl border border-dashed border-indigo-200 dark:border-indigo-950 hover:bg-slate-50 dark:hover:bg-slate-850 px-4 py-2.5 text-xs sm:text-sm font-bold text-indigo-600 dark:text-indigo-400 transition-colors">
                    <Upload className="h-4 w-4" /> 
                    {uploadingDocx ? 'Memproses Fail...' : 'Pilih & Muat Naik Fail DOCX'}
                  </div>
                </div>

                <button
                  onClick={loadExistingQuestions}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Muat Semula Soalan Semasa
                </button>
              </div>
            </div>

            {importMessage && (
              <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-400 text-xs font-semibold flex items-start gap-2">
                <Check className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{importMessage}</span>
              </div>
            )}

            {importError && (
              <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-100 dark:bg-red-950/20 dark:border-red-900/40 text-red-800 dark:text-red-400 text-xs font-semibold flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{importError}</span>
              </div>
            )}

            {/* Panduan & Templat Format Fail Word (.docx) */}
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-indigo-500" /> Panduan & Templat Format Fail Word (.docx)
                  </h3>
                  <p className="text-[11px] text-slate-500">Gunakan susunan dan format di bawah bagi memastikan sistem dapat mengekstrak soalan dengan sempurna tanpa ralat.</p>
                </div>
                <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                  <button
                    onClick={handleCopyTemplateText}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Telah Disalin!' : 'Salin Contoh Teks'}
                  </button>
                  <a
                    href="/api/admin/download-template"
                    download="Templat_Soalan_FahamAI.docx"
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-900/50 px-3.5 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" /> Muat Turun Templat Word (.docx)
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850/50 space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Peraturan Format Penting:</h4>
                  <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2 list-disc pl-4">
                    <li>Setiap soalan ditulis terus (boleh bermula dengan nombor atau tidak, cth: <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono font-semibold">1.</code>).</li>
                    <li>Sediakan tepat 4 pilihan jawapan dimulakan dengan format <code className="px-1 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded font-bold">A.</code>, <code className="px-1 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded font-bold">B.</code>, <code className="px-1 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded font-bold">C.</code>, dan <code className="px-1 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded font-bold">D.</code>.</li>
                    <li>Di baris selepas pilihan D, tambah baris jawapan seperti <code className="px-1 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded font-bold">Jawapan: B</code> atau <code className="px-1 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded font-bold">Answer: B</code>.</li>
                    <li>Sila letakkan sekurang-kurangnya satu baris kosong (jarak) di antara setiap set soalan.</li>
                  </ul>
                </div>

                <div className="relative">
                  <pre className="p-4 rounded-xl bg-slate-950 text-slate-300 font-mono text-[11px] leading-relaxed overflow-y-auto max-h-[180px] border border-slate-850 select-text">
{`1. Apakah ibu negara bagi negara Malaysia?
A. George Town
B. Kuala Lumpur
C. Shah Alam
D. Johor Bahru
Jawapan: B

2. Berapakah bilangan rukun Islam?
A. Lima (5)
B. Enam (6)
C. Empat (4)
D. Tujuh (7)
Jawapan: A`}
                  </pre>
                  <span className="absolute bottom-2 right-2 bg-slate-900/80 text-slate-500 text-[9px] px-1.5 py-0.5 rounded font-sans uppercase tracking-wider">Pratonton Struktur</span>
                </div>
              </div>
            </div>
          </div>

          {/* Preview of Parsed / Working Questions list */}
          {parsedQuestions.length > 0 && (
            <div className="glass-card rounded-2xl border border-indigo-200/50 dark:border-indigo-950/30 p-6 space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-indigo-950 dark:text-indigo-400">Hasil Pemprosesan Fail (Preview Sebelum Menerbit)</h3>
                  <p className="text-xs text-slate-500">Anda boleh menyunting teks, menambah soalan atau membuang soalan sebelum ia disimpan kekal ke pangkalan data.</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={handleAddParsedQuestion}
                    className="rounded-xl border border-indigo-200 text-indigo-600 dark:border-indigo-900 dark:text-indigo-400 hover:bg-indigo-50 px-3.5 py-2 text-xs font-bold transition-all cursor-pointer"
                  >
                    Tambah Soalan Manual
                  </button>
                  <button
                    onClick={handleSaveQuestionsToDb}
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-500/10 cursor-pointer"
                  >
                    Sahkan & Terbitkan Kuiz ({parsedQuestions.length} Soalan)
                  </button>
                </div>
              </div>

              {/* Editable Question Cards */}
              <div className="space-y-6 max-h-[550px] overflow-y-auto pr-2">
                {parsedQuestions.map((q, qIdx) => (
                  <div key={qIdx} className="p-5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-slate-900/40 relative space-y-3.5">
                    <button
                      onClick={() => handleRemoveParsedQuestion(qIdx)}
                      className="absolute top-4 right-4 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 p-1.5 rounded-lg"
                      title="Padam soalan"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <div className="max-w-[90%]">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Soalan {qIdx + 1}</span>
                      <input
                        type="text"
                        value={q.questionText}
                        onChange={(e) => handleUpdateParsedQuestion(qIdx, 'questionText', e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 focus:border-indigo-500 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {q.options.map((opt: any, oIdx: number) => (
                        <div key={opt.key} className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 h-6 w-6 rounded-full flex items-center justify-center shrink-0">{opt.key}</span>
                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e) => handleUpdateParsedOption(qIdx, oIdx, e.target.value)}
                            className="flex-1 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:border-indigo-500 outline-none"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs">
                      <span className="font-bold text-slate-500">Pilihan Jawapan Betul:</span>
                      <div className="flex gap-1">
                        {['A', 'B', 'C', 'D'].map(key => (
                          <button
                            key={key}
                            onClick={() => handleUpdateParsedQuestion(qIdx, 'correctAnswer', key)}
                            className={`h-7 w-7 rounded-lg font-bold transition-all text-xs cursor-pointer ${
                              q.correctAnswer === key
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            {key}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Existing Questions view (if no docx parsed active) */}
          {parsedQuestions.length === 0 && (
            <div className="glass-card rounded-2xl border border-slate-200/50 dark:border-slate-800/30 p-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  Set Soalan Terbitan Semasa ({existingQuestions.length} soalan)
                </h3>
              </div>

              {loadingQuestions ? (
                <div className="text-center py-12 text-xs text-slate-400">Memuatkan soalan...</div>
              ) : existingQuestions.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  <FileText className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                  Tiada soalan diterbitkan untuk latihan ini lagi. Muat naik fail DOCX untuk bermula.
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {existingQuestions.map((q, idx) => (
                    <div key={q.id} className="p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/20 text-xs">
                      <div className="font-bold text-slate-800 dark:text-slate-200 mb-2">
                        {idx + 1}. {q.questionText}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-4 mb-2.5">
                        {q.options.map(opt => (
                          <div key={opt.key} className={opt.key === q.correctAnswer ? 'text-emerald-600 font-bold' : 'text-slate-500'}>
                            <span className="font-mono font-bold mr-1">{opt.key}.</span> {opt.text}
                          </div>
                        ))}
                      </div>
                      <div className="text-[10px] text-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 inline-block px-2 py-0.5 rounded-full font-bold">
                        Jawapan Betul: {q.correctAnswer}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. PARTICIPANTS & EXPORT CSV VIEW */}
      {activeSubTab === 'participants' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="flex-1 max-w-md">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Pilih Modul Latihan</label>
                <select
                  value={selectedPTrainingId}
                  onChange={(e) => setSelectedPTrainingId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 px-4 py-2.5 text-xs sm:text-sm outline-none focus:border-indigo-500"
                >
                  {trainings.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {participantsList.length > 0 && (
                <button
                  onClick={() => {
                    const t = trainings.find(tr => tr.id === selectedPTrainingId);
                    exportParticipantsToCsv(participantsList, t?.name || 'Latihan');
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/10 cursor-pointer"
                >
                  <Download className="h-4 w-4" /> Eksport Laporan (CSV)
                </button>
              )}
            </div>
          </div>

          <div className="glass-card rounded-2xl border border-slate-200/50 dark:border-slate-800/30 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Senarai Peserta Berdaftar & Prestasi Percubaan</h3>
              <p className="text-xs text-slate-500">Melihat butiran pelajar, markah terbaik diperoleh, dan status pensijilan mereka.</p>
            </div>

            {loadingParticipants ? (
              <div className="text-center py-12 text-xs text-slate-400">Memuatkan peserta...</div>
            ) : participantsList.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">Tiada peserta mendaftar bagi modul latihan ini lagi.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 font-bold text-slate-500 uppercase border-b border-slate-100 dark:border-slate-800">
                      <th className="p-4">Maklumat Pelajar</th>
                      <th className="p-4">ID / Organisasi</th>
                      <th className="p-4 text-center">Bil. Percubaan</th>
                      <th className="p-4 text-center">Markah Terbaik</th>
                      <th className="p-4 text-center">Status Sijil</th>
                      <th className="p-4 text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {participantsList.map((p, pIdx) => (
                      <tr key={pIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 font-medium">
                        <td className="p-4">
                          <div className="font-bold text-slate-800 dark:text-slate-100">{p.fullName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{p.email}</div>
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-400">
                          <div>ID: <span className="font-mono font-semibold">{p.studentId}</span></div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[200px]">{p.organization}</div>
                        </td>
                        <td className="p-4 text-center text-slate-500">{p.attemptsCount} kali</td>
                        <td className="p-4 text-center">
                          {p.bestScore !== null ? (
                            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{p.bestScore}%</span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Tiada percubaan</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {p.passed ? (
                            <span className="inline-flex rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-0.5 font-bold text-[10px]">LULUS ({p.certificateNumber})</span>
                          ) : (
                            <span className="inline-flex rounded-full bg-red-50 text-red-700 px-2.5 py-0.5 font-bold text-[10px]">GAGAL / TIADA</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            {p.attempts.map((att) => (
                              <button
                                key={att.id}
                                onClick={() => onViewResult(att.id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 px-2 py-1 text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                                title={`Sila lihat keputusan percubaan ${att.attemptNumber} (${att.score}%)`}
                              >
                                <Eye className="h-3 w-3" /> P{att.attemptNumber}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. AUDIT LOGS TIMELINE */}
      {activeSubTab === 'logs' && (
        <div className="glass-card rounded-2xl border border-slate-200/50 dark:border-slate-800/30 overflow-hidden p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Log Audit Sistem Admin</h2>
            <p className="text-xs text-slate-500">Merekodkan setiap aktiviti dan tindakan penting yang dilakukan oleh pentadbir sistem FahamAI.</p>
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {auditLogs.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400">Tiada rekod log ditemui.</div>
            ) : (
              auditLogs.map((log: any) => {
                const formattedDate = new Date(log.createdAt).toLocaleString('ms-MY');
                return (
                  <div key={log.id} className="flex gap-4 items-start text-xs border-l-2 border-indigo-100 dark:border-indigo-950 pl-4 py-1">
                    <div className="shrink-0 font-mono text-[10px] text-slate-400 mt-0.5">{formattedDate}</div>
                    <div>
                      <span className="font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 px-1.5 py-0.5 rounded mr-2 font-mono tracking-wider">{log.action}</span>
                      <span className="text-slate-700 dark:text-slate-300">{log.details}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
