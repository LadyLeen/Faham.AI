import React, { useState, useEffect } from 'react';
import { BookOpen, User, Calendar, Award, MapPin, ClipboardList, CheckCircle, XCircle, ChevronRight, Play, Eye, RefreshCw, Save } from 'lucide-react';
import { Training, StudentProfile } from '../types';

interface StudentPortalProps {
  trainings: Training[];
  profile: StudentProfile | null;
  onRegisterTraining: (trainingId: string) => void;
  onStartQuiz: (trainingId: string) => void;
  onUpdateProfile: (data: { fullName: string; studentId: string; organization: string }) => Promise<void>;
  onViewResult: (attemptId: string) => void;
  history: any[];
  onRefresh: () => void;
}

export default function StudentPortal({
  trainings,
  profile,
  onRegisterTraining,
  onStartQuiz,
  onUpdateProfile,
  onViewResult,
  history,
  onRefresh,
}: StudentPortalProps) {
  const [activeTab, setActiveTab] = useState<'available' | 'history' | 'profile'>('available');
  
  // Profile form state
  const [fullName, setFullName] = useState(profile?.fullName || '');
  const [studentId, setStudentId] = useState(profile?.studentId || '');
  const [organization, setOrganization] = useState(profile?.organization || '');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName);
      setStudentId(profile.studentId);
      setOrganization(profile.organization);
    }
  }, [profile]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');
    setSavingProfile(true);

    try {
      await onUpdateProfile({ fullName, studentId, organization });
      setProfileSuccess('Profil anda berjaya dikemas kini!');
      setTimeout(() => setProfileSuccess(''), 4000);
    } catch (err: any) {
      setProfileError(err.message || 'Gagal mengemas kini profil.');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in no-print">
      {/* Top Welcome Panel */}
      <div className="relative mb-8 rounded-2xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-indigo-800 p-6 sm:p-8 text-white shadow-xl shadow-indigo-500/10">
        <div className="absolute top-0 right-0 p-6 opacity-10 hidden sm:block">
          <Award className="h-32 w-32" />
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
          Portal Pelajar Pintar
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Hai, {profile?.fullName || 'Pelajar FahamAI'}!
        </h1>
        <p className="mt-2 max-w-xl text-indigo-100 text-sm sm:text-base">
          Sedia untuk menguji kefahaman anda? Sila daftar latihan yang disertai, selesaikan kuiz, dan dapatkan sijil digital pintar yang diiktiraf serta-merta.
        </p>

        {/* Mini stats banner */}
        <div className="mt-6 flex flex-wrap gap-4 pt-6 border-t border-white/10 text-xs sm:text-sm">
          <div>
            <span className="text-indigo-200">Organisasi:</span> <span className="font-bold">{profile?.organization || '-'}</span>
          </div>
          <div className="hidden sm:block text-indigo-300">|</div>
          <div>
            <span className="text-indigo-200">ID Pelajar / KP:</span> <span className="font-mono font-bold bg-white/10 px-1.5 py-0.5 rounded">{profile?.studentId || '-'}</span>
          </div>
          <div className="hidden sm:block text-indigo-300">|</div>
          <div>
            <span className="text-indigo-200">Sijil Layak:</span> <span className="font-bold">{history.filter(h => h.hasPassed).length} Sijil</span>
          </div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 gap-2">
        <button
          onClick={() => setActiveTab('available')}
          className={`pb-3.5 px-2 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'available'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <BookOpen className="h-4 w-4" /> Latihan & Kuiz
        </button>
        <button
          onClick={() => {
            setActiveTab('history');
            onRefresh();
          }}
          className={`pb-3.5 px-2 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'history'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <ClipboardList className="h-4 w-4" /> Sejarah Percubaan ({history.length})
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3.5 px-2 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'profile'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <User className="h-4 w-4" /> Profil Saya
        </button>
      </div>

      {/* Available Trainings Tab */}
      {activeTab === 'available' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trainings.length === 0 ? (
            <div className="col-span-full py-12 text-center rounded-2xl border border-dashed border-slate-350 dark:border-slate-800/80 glass">
              <BookOpen className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-base font-bold text-slate-700 dark:text-slate-300">Tiada Latihan Aktif</h3>
              <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">Admin belum menerbitkan sebarang modul latihan atau kuiz buat masa ini.</p>
            </div>
          ) : (
            trainings.map((t) => {
              const histItem = history.find(h => h.training?.id === t.id);
              const isRegistered = t.isRegistered;
              const hasPassed = t.hasPassed;
              const remainingAttempts = t.remainingAttempts ?? t.maxAttempts;

              return (
                <div 
                  key={t.id} 
                  className={`flex flex-col justify-between rounded-2xl border glass-card transition-all hover:shadow-md ${
                    hasPassed 
                      ? 'border-emerald-200/50 dark:border-emerald-900/40 bg-emerald-50/10' 
                      : 'border-slate-200/50 dark:border-slate-800/30'
                  }`}
                >
                  {/* Top training details */}
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        hasPassed
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : isRegistered
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400'
                            : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {hasPassed ? 'Selesai & Lulus' : isRegistered ? 'Sudah Mendaftar' : 'Tersedia'}
                      </span>

                      <div className="text-right text-xs font-mono text-slate-500">
                        Lulus: <span className="font-bold text-indigo-600 dark:text-indigo-400">{t.passingScore}%</span>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
                      {t.name}
                    </h3>
                    <p className="mt-2.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-3">
                      {t.description}
                    </p>

                    {/* Meta information tags */}
                    <div className="mt-5 space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>Tarikh: {t.date}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        <span className="truncate">Lokasi: {t.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span className="truncate">Jurulatih: {t.trainer}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <ClipboardList className="h-3.5 w-3.5 text-slate-400" />
                        <span>Sesi Kuiz: {t.durationMinutes} minit | Had {t.maxAttempts}x percubaan</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom dynamic action buttons */}
                  <div className="border-t border-slate-100 dark:border-slate-800 p-5 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-2xl">
                    {hasPassed && histItem?.certificate ? (
                      <button
                        onClick={() => onViewResult(histItem.attempts[0]?.id)}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-500/10 cursor-pointer transition-all"
                      >
                        <Award className="h-3.5 w-3.5" /> Lihat & Muat Turun Sijil
                      </button>
                    ) : !isRegistered ? (
                      <button
                        onClick={() => onRegisterTraining(t.id)}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/10 cursor-pointer transition-all"
                      >
                        Daftar Latihan Ini <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    ) : remainingAttempts <= 0 ? (
                      <div className="text-center py-2 text-xs font-bold text-red-500 bg-red-50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/30 rounded-lg">
                        Percubaan Tamat ({t.attemptsCount}/{t.maxAttempts})
                      </div>
                    ) : (
                      <button
                        onClick={() => onStartQuiz(t.id)}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/15 cursor-pointer transition-all"
                      >
                        <Play className="h-3.5 w-3.5" /> Jawab Kuiz (Baki {remainingAttempts} Percubaan)
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Quiz History Tab */}
      {activeTab === 'history' && (
        <div className="glass-card rounded-2xl border border-slate-200/50 dark:border-slate-800/30 overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Rekod Percubaan Kuiz</h2>
              <p className="text-xs text-slate-500">Senarai latihan, keputusan, masa menjawab, dan sijil digital anda.</p>
            </div>
            <button
              onClick={onRefresh}
              className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Segarkan
            </button>
          </div>

          {history.length === 0 ? (
            <div className="p-12 text-center">
              <ClipboardList className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4 text-sm font-bold text-slate-500">Tiada sejarah jawapan ditemui.</p>
              <p className="text-xs text-slate-400 mt-1">Sila daftar latihan dan ambil kuiz terlebih dahulu.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-500 uppercase border-b border-slate-100 dark:border-slate-800">
                    <th className="p-4 sm:p-5">Latihan</th>
                    <th className="p-4 sm:p-5">No. Percubaan</th>
                    <th className="p-4 sm:p-5">Masa Menjawab</th>
                    <th className="p-4 sm:p-5">Markah</th>
                    <th className="p-4 sm:p-5">Status</th>
                    <th className="p-4 sm:p-5 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {history.flatMap(h => h.attempts.map((att: any) => {
                    const formattedDuration = att.durationSeconds 
                      ? `${Math.floor(att.durationSeconds / 60)}m ${att.durationSeconds % 60}s`
                      : 'N/A';

                    return (
                      <tr key={att.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 text-xs sm:text-sm">
                        <td className="p-4 sm:p-5 font-semibold text-slate-800 dark:text-slate-200">
                          {h.training?.name}
                        </td>
                        <td className="p-4 sm:p-5 text-slate-500">
                          Percubaan {att.attemptNumber}
                        </td>
                        <td className="p-4 sm:p-5 font-mono text-slate-500">
                          {formattedDuration}
                        </td>
                        <td className="p-4 sm:p-5 font-bold text-indigo-600 dark:text-indigo-400">
                          {att.score}%
                        </td>
                        <td className="p-4 sm:p-5">
                          {att.passed ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 px-2 py-0.5 text-xs font-semibold">
                              <CheckCircle className="h-3.5 w-3.5" /> Lulus
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 px-2 py-0.5 text-xs font-semibold">
                              <XCircle className="h-3.5 w-3.5" /> Gagal
                            </span>
                          )}
                        </td>
                        <td className="p-4 sm:p-5 text-right">
                          <button
                            onClick={() => onViewResult(att.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" /> Semak
                          </button>
                        </td>
                      </tr>
                    );
                  }))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="max-w-2xl mx-auto glass-card rounded-2xl border border-slate-200/50 dark:border-slate-800/30 overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Maklumat Profil Pelajar</h2>
            <p className="text-xs text-slate-500">Sila pastikan nama penuh sepadan dengan dokumen rasmi anda kerana ia akan dicetak terus pada Sijil Pencapaian.</p>
          </div>

          <form onSubmit={handleProfileSubmit} className="p-6 space-y-5">
            {profileSuccess && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-400 text-sm font-semibold">
                {profileSuccess}
              </div>
            )}
            {profileError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-800 dark:bg-red-950/20 dark:border-red-900/40 dark:text-red-400 text-sm font-semibold">
                {profileError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Nama Penuh Pelajar (Seperti Di Sijil)
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="cth: Ahmad Faiz bin Roslan"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  No. Kad Pengenalan / ID Pelajar
                </label>
                <input
                  type="text"
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="cth: ST-1004"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-colors font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Alamat E-mel (Sistem)
                </label>
                <input
                  type="email"
                  disabled
                  value={profile?.email || ''}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-4 py-3 text-sm text-slate-400 cursor-not-allowed font-mono outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Organisasi / Syarikat / Kolej
              </label>
              <input
                type="text"
                required
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="cth: Universiti Teknologi Malaysia (UTM)"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-colors"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/10 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                <Save className="h-4 w-4" /> {savingProfile ? 'Menyimpan...' : 'Kemas Kini Profil'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
