import { ParticipantRegistration } from '../types';

export function exportParticipantsToCsv(participants: ParticipantRegistration[], trainingName: string) {
  // Define headers
  const headers = [
    'Nama Penuh',
    'ID Pelajar / Kad Pengenalan',
    'E-mel',
    'Organisasi',
    'Tarikh Daftar',
    'Bilangan Percubaan',
    'Markah Tertinggi (%)',
    'Status Lulus',
    'Nombor Sijil Digital'
  ];

  const rows = participants.map(p => [
    p.fullName,
    p.studentId,
    p.email,
    p.organization,
    new Date(p.registeredAt).toLocaleDateString('ms-MY'),
    p.attemptsCount,
    p.bestScore !== null ? `${p.bestScore}%` : 'Tiada Percubaan',
    p.passed ? 'LULUS' : 'GAGAL/BELUM SELESAI',
    p.certificateNumber || 'Tiada Sijil'
  ]);

  // Merge headers and rows with UTF-8 support
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(value => {
      // Escape commas, quotes and newlines
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(','))
  ].join('\n');

  // Trigger download in browser with UTF-8 BOM
  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  
  const sanitizedName = trainingName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  link.setAttribute('download', `fahamai_keputusan_${sanitizedName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
