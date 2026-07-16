import React from 'react';
import { Download, Printer, CheckCircle, ShieldCheck, Award, Calendar, Bookmark, Share2 } from 'lucide-react';

interface CertificateViewProps {
  studentName: string;
  studentId: string;
  organization: string;
  trainingName: string;
  issueDate: string;
  certNumber: string;
  score: number;
  organizer: string;
  trainer: string;
}

export default function CertificateView({
  studentName,
  studentId,
  organization,
  trainingName,
  issueDate,
  certNumber,
  score,
  organizer,
  trainer,
}: CertificateViewProps) {
  const formattedDate = new Date(issueDate).toLocaleDateString('ms-MY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const verificationUrl = `${window.location.origin}/?verify=${certNumber}`;

  // Simple QR Code SVG Generator (Mock matrix for decorative purposes)
  const renderMockQR = () => {
    return (
      <svg className="h-20 w-20 text-slate-800 dark:text-slate-100" viewBox="0 0 100 100" fill="currentColor">
        {/* Borders and anchor points */}
        <path d="M0,0 h30 v10 h-20 v20 h-10 z" />
        <path d="M70,0 h30 v30 h-10 v-20 h-20 z" />
        <path d="M0,70 h10 v20 h20 v10 h-30 z" />
        {/* Random dots inside to look like a high tech QR */}
        <rect x="15" y="15" width="10" height="10" />
        <rect x="75" y="15" width="10" height="10" />
        <rect x="15" y="75" width="10" height="10" />
        <rect x="35" y="20" width="15" height="5" />
        <rect x="55" y="25" width="5" height="15" />
        <rect x="30" y="45" width="20" height="10" />
        <rect x="60" y="50" width="15" height="10" />
        <rect x="35" y="70" width="10" height="15" />
        <rect x="55" y="75" width="20" height="5" />
        <rect x="45" y="5" width="5" height="5" />
        <rect x="5" y="45" width="5" height="5" />
        <rect x="90" y="45" width="5" height="5" />
      </svg>
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    navigator.clipboard.writeText(verificationUrl);
    alert('Pautan pengesahan sijil telah disalin ke papan klip anda!');
  };

  return (
    <div className="flex flex-col items-center gap-6 py-6 animate-fade-in">
      {/* Action Bar */}
      <div className="flex flex-wrap gap-3 justify-center no-print w-full max-w-4xl">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-500 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
        >
          <Printer className="h-4 w-4" /> Cetak / Muat Turun PDF Sijil
        </button>
        <button
          onClick={handleShare}
          className="flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-5 py-2.5 text-sm font-bold text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
        >
          <Share2 className="h-4 w-4" /> Salin Pautan Pengesahan
        </button>
      </div>

      {/* Certificate Frame Container */}
      <div 
        id="certificate-print-area"
        className="relative w-full max-w-4xl bg-white text-slate-900 border-[16px] border-double border-indigo-950 p-8 sm:p-14 shadow-2xl rounded-sm overflow-hidden"
        style={{ aspectRatio: '1.414/1' }} // Standard landscape certificate ratio
      >
        {/* Aesthetic Background Watermark / Graphics */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.02] flex items-center justify-center">
          <Award className="w-[450px] h-[450px] text-indigo-950" />
        </div>
        <div className="absolute -left-16 -top-16 w-36 h-36 border-4 border-indigo-200 rounded-full opacity-20 pointer-events-none" />
        <div className="absolute -right-16 -bottom-16 w-48 h-48 border-4 border-indigo-200 rounded-full opacity-20 pointer-events-none" />

        {/* Certificate Content Grid */}
        <div className="relative h-full flex flex-col justify-between items-center text-center">
          {/* Header */}
          <div className="w-full flex flex-col items-center">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-8 w-8 rounded-lg bg-indigo-950 flex items-center justify-center">
                <Award className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-extrabold tracking-widest text-indigo-950 uppercase">
                FAHAMAI CERTIFICATION
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-indigo-950 uppercase font-serif">
              Sijil Pencapaian
            </h1>
            <div className="w-32 h-1 bg-gradient-to-r from-amber-500 via-indigo-950 to-amber-500 my-4" />
            <p className="text-xs sm:text-sm font-semibold tracking-wide text-slate-500 uppercase">
              Dengan ini diperakui bahawa
            </p>
          </div>

          {/* Recipient details */}
          <div className="my-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-indigo-900 leading-tight">
              {studentName}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              ID Pelajar: <span className="font-mono font-bold text-slate-800">{studentId}</span> | {organization}
            </p>
          </div>

          {/* Achievement Description */}
          <div className="max-w-2xl px-4">
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              telah dengan jayanya menyempurnakan kursus penilaian di bawah platform pembelajaran pintar FahamAI bagi latihan:
            </p>
            <h3 className="text-lg sm:text-xl font-bold text-indigo-950 mt-2 hover:text-indigo-900 transition-colors">
              {trainingName}
            </h3>
            <p className="text-xs text-indigo-700 font-bold mt-2.5 bg-indigo-50/70 inline-block px-3 py-1 rounded-full border border-indigo-100">
              Pencapaian Cemerlang Kuiz: <span className="text-sm font-extrabold">{score}%</span> (Status: LULUS)
            </p>
          </div>

          {/* Signatures & Footer info */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-3 items-end gap-6 mt-8">
            {/* Left Col: Verification QR Code */}
            <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
              <div className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg inline-block shadow-inner">
                {renderMockQR()}
              </div>
              <span className="text-[9px] font-mono font-bold text-slate-400 mt-1.5 uppercase tracking-wider block">
                Kod Pengesahan Sijil
              </span>
              <span className="text-[10px] font-bold text-indigo-900 select-all block break-all font-mono">
                {certNumber}
              </span>
            </div>

            {/* Middle Col: Gold Seal / Stamp */}
            <div className="flex justify-center h-24 items-center">
              <div className="relative flex items-center justify-center w-20 h-20 bg-amber-400 rounded-full border-4 border-amber-300 shadow-md">
                <div className="absolute inset-1.5 border-2 border-dashed border-amber-600 rounded-full" />
                <ShieldCheck className="h-10 w-10 text-amber-950" />
                {/* Decorative ribbons */}
                <div className="absolute -bottom-4 left-4 w-4 h-8 bg-amber-500 transform -skew-x-12 origin-top rounded-b-md shadow-sm" />
                <div className="absolute -bottom-4 right-4 w-4 h-8 bg-amber-500 transform skew-x-12 origin-top rounded-b-md shadow-sm" />
              </div>
            </div>

            {/* Right Col: Signatures */}
            <div className="flex flex-col items-center sm:items-end text-center sm:text-right">
              {/* Fake written signature */}
              <div className="h-12 flex items-center justify-center px-4">
                <span className="font-serif italic text-xl font-bold tracking-widest text-indigo-900/80 transform rotate-1">
                  {trainer}
                </span>
              </div>
              <div className="w-48 h-[1px] bg-slate-300 my-1" />
              <p className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wide">
                {trainer}
              </p>
              <p className="text-[9px] font-bold text-slate-500 uppercase">
                Tenaga Pengajar Utama, {organizer}
              </p>
              <p className="text-[9px] font-mono text-slate-400 mt-1">
                Dikeluarkan pada: {formattedDate}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
