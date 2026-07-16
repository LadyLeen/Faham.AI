import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// Interface Definitions
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'student';
  createdAt: string;
}

export interface StudentProfile {
  id: string;
  userId: string;
  fullName: string;
  studentId: string;
  email: string;
  organization: string;
  updatedAt: string;
}

export interface Training {
  id: string;
  name: string;
  description: string;
  date: string;
  location: string;
  organizer: string;
  trainer: string;
  passingScore: number; // e.g. 80
  durationMinutes: number; // e.g. 15
  maxAttempts: number; // e.g. 3
  randomizeQuestions: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface Question {
  id: string;
  trainingId: string;
  questionText: string;
  options: {
    key: 'A' | 'B' | 'C' | 'D';
    text: string;
  }[];
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  createdAt: string;
}

export interface TrainingRegistration {
  id: string;
  studentUserId: string;
  trainingId: string;
  registeredAt: string;
}

export interface QuizAttempt {
  id: string;
  studentUserId: string;
  trainingId: string;
  attemptNumber: number;
  startTime: string;
  endTime: string | null;
  score: number | null; // percentage, e.g. 85
  passed: boolean | null;
  totalQuestions: number;
  correctAnswers: number;
}

export interface StudentAnswer {
  id: string;
  attemptId: string;
  questionId: string;
  selectedOption: 'A' | 'B' | 'C' | 'D';
  isCorrect: boolean;
  answeredAt: string;
}

export interface Certificate {
  id: string;
  studentUserId: string;
  trainingId: string;
  attemptId: string;
  certNumber: string; // FahamAI-YYYYMMDD-XXXX
  issueDate: string;
}

export interface AdminAuditLog {
  id: string;
  adminUserId: string;
  action: string;
  details: string;
  createdAt: string;
}

export interface DatabaseSchema {
  users: User[];
  studentProfiles: StudentProfile[];
  trainings: Training[];
  questions: Question[];
  trainingRegistrations: TrainingRegistration[];
  quizAttempts: QuizAttempt[];
  studentAnswers: StudentAnswer[];
  certificates: Certificate[];
  adminAuditLogs: AdminAuditLog[];
}

// Initial Database State
const initialDb: DatabaseSchema = {
  users: [],
  studentProfiles: [],
  trainings: [],
  questions: [],
  trainingRegistrations: [],
  quizAttempts: [],
  studentAnswers: [],
  certificates: [],
  adminAuditLogs: [],
};

// Helper for hashing password safely
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + 'fahamai_secret_salt_123').digest('hex');
}

// Database Class
class Database {
  private data: DatabaseSchema = { ...initialDb };

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf8');
        this.data = JSON.parse(fileContent);
      } else {
        this.seed();
        this.save();
      }
    } catch (error) {
      console.error('Error loading database, resetting to initial:', error);
      this.data = { ...initialDb };
    }
  }

  public save() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving database:', error);
    }
  }

  private seed() {
    // Admin User
    const adminId = 'u-admin-1';
    const adminUser: User = {
      id: adminId,
      email: 'admin@fahamai.com',
      passwordHash: hashPassword('admin123'),
      role: 'admin',
      createdAt: new Date().toISOString(),
    };

    // Default student user for testing
    const studentId = 'u-student-1';
    const studentUser: User = {
      id: studentId,
      email: 'pelajar@fahamai.com',
      passwordHash: hashPassword('pelajar123'),
      role: 'student',
      createdAt: new Date().toISOString(),
    };

    const studentProfile: StudentProfile = {
      id: 'p-student-1',
      userId: studentId,
      fullName: 'Ahmad Faiz bin Roslan',
      studentId: 'ST-991204',
      email: 'pelajar@fahamai.com',
      organization: 'Universiti Teknologi Malaysia (UTM)',
      updatedAt: new Date().toISOString(),
    };

    // Default Training
    const trainingId1 = 't-cyber-1';
    const training1: Training = {
      id: trainingId1,
      name: 'Asas Keselamatan Siber & Kesedaran Phishing',
      description: 'Latihan intensif mengenai cara mengesan serangan siber, menghindari emel penipuan (phishing), dan amalan terbaik keselamatan data digital organisasi.',
      date: '2026-07-15',
      location: 'Dewan Lestari Cyberjaya & Atas Talian',
      organizer: 'CyberSecurity Malaysia & FahamAI',
      trainer: 'Dr. Khairul Anuar bin Salim',
      passingScore: 80,
      durationMinutes: 10,
      maxAttempts: 3,
      randomizeQuestions: true,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    const questions: Question[] = [
      {
        id: 'q-1',
        trainingId: trainingId1,
        questionText: 'Apakah maksud keselamatan siber?',
        options: [
          { key: 'A', text: 'Perlindungan sistem, rangkaian, dan data daripada serangan digital' },
          { key: 'B', text: 'Pengurusan belanjawan dan pelaburan kewangan digital' },
          { key: 'C', text: 'Pemasangan kamera litar tertutup (CCTV) di sekeliling premis pejabat' },
          { key: 'D', text: 'Pembangunan aplikasi mudah alih untuk pengurusan sumber manusia' }
        ],
        correctAnswer: 'A',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'q-2',
        trainingId: trainingId1,
        questionText: 'Apakah tanda-tanda utama emel phishing yang mencurigakan?',
        options: [
          { key: 'A', text: 'Menggunakan logo syarikat yang rasmi dan beralamat betul' },
          { key: 'B', text: 'Mempunyai lampiran PDF biasa yang tidak meminta maklumat peribadi' },
          { key: 'C', text: 'Terdapat desakan untuk bertindak segera, tatabahasa lemah, dan pautan yang tidak sepadan' },
          { key: 'D', text: 'Dihantar oleh rakan sekerja yang menggunakan emel rasmi organisasi' }
        ],
        correctAnswer: 'C',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'q-3',
        trainingId: trainingId1,
        questionText: 'Apakah amalan terbaik untuk mencipta kata laluan yang kuat?',
        options: [
          { key: 'A', text: 'Menggunakan nama sendiri diikuti oleh tahun lahir' },
          { key: 'B', text: 'Gabungan sekurang-kurangnya 12 aksara termasuk huruf besar, kecil, nombor, dan simbol unik' },
          { key: 'C', text: 'Menggunakan kata laluan yang sama untuk semua akaun bagi mengelakkan lupa' },
          { key: 'D', text: 'Menggunakan perkataan mudah seperti "password123"' }
        ],
        correctAnswer: 'B',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'q-4',
        trainingId: trainingId1,
        questionText: 'Apakah fungsi utama pengesahan dwi-faktor (2FA)?',
        options: [
          { key: 'A', text: 'Membolehkan dua orang berkongsi akaun yang sama secara serentak' },
          { key: 'B', text: 'Mempercepatkan proses pendaftaran akaun baru' },
          { key: 'C', text: 'Menyediakan lapisan keselamatan tambahan dengan meminta kod pengesahan kedua selain kata laluan' },
          { key: 'D', text: 'Menyalin semua data akaun secara automatik ke dalam pelayan awan' }
        ],
        correctAnswer: 'C',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'q-5',
        trainingId: trainingId1,
        questionText: 'Apakah yang perlu anda lakukan sekiranya anda menerima emel yang mencurigakan meminta menukar kata laluan bank anda?',
        options: [
          { key: 'A', text: 'Klik pada pautan tersebut dan segera kemas kini kata laluan' },
          { key: 'B', text: 'Abaikan dan padam emel tersebut, atau laporkan kepada unit IT bank secara terus' },
          { key: 'C', text: 'Memajukan emel tersebut kepada semua rakan kenalan anda' },
          { key: 'D', text: 'Membalas emel tersebut dengan maklumat log masuk anda untuk pengesahan' }
        ],
        correctAnswer: 'B',
        createdAt: new Date().toISOString(),
      }
    ];

    const trainingId2 = 't-ai-2';
    const training2: Training = {
      id: trainingId2,
      name: 'Bengkel Produktiviti AI Generatif dengan Gemini',
      description: 'Menerokai penggunaan AI generatif dalam tugasan harian, teknik penulisan prompt (prompt engineering), dan pematuhan etika penggunaan AI di tempat kerja.',
      date: '2026-07-20',
      location: 'Atas Talian (Google Meet)',
      organizer: 'FahamAI & Google Cloud Malaysia Partner',
      trainer: 'Puan Siti Nurhaliza binti Hamid',
      passingScore: 80,
      durationMinutes: 15,
      maxAttempts: 2,
      randomizeQuestions: false,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    const questions2: Question[] = [
      {
        id: 'q-ai-1',
        trainingId: trainingId2,
        questionText: 'Apakah definisi terbaik bagi AI Generatif?',
        options: [
          { key: 'A', text: 'Teknologi AI yang hanya boleh menganalisis data berangka tanpa menghasilkan kandungan baru' },
          { key: 'B', text: 'Model kecerdasan buatan yang mampu menghasilkan kandungan baru seperti teks, imej, kod, atau audio berdasarkan input (prompt)' },
          { key: 'C', text: 'Sistem robotik fizikal yang digunakan untuk memasang kereta di kilang' },
          { key: 'D', text: 'Satu jenama perkakasan komputer terbaru' }
        ],
        correctAnswer: 'B',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'q-ai-2',
        trainingId: trainingId2,
        questionText: 'Dalam prompt engineering, apakah struktur asas prompt yang baik?',
        options: [
          { key: 'A', text: 'Satu perkataan arahan ringkas tanpa konteks' },
          { key: 'B', text: 'Arahan yang panjang dan berbelit-belit supaya AI bingung' },
          { key: 'C', text: 'Mengandungi Peranan (Role), Konteks (Context), Arahan (Instruction), dan Format Output yang diingini' },
          { key: 'D', text: 'Menulis prompt dalam huruf besar sepenuhnya sahaja' }
        ],
        correctAnswer: 'C',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'q-ai-3',
        trainingId: trainingId2,
        questionText: 'Apakah fenomena di mana model AI menghasilkan maklumat palsu tetapi kelihatan sangat meyakinkan?',
        options: [
          { key: 'A', text: 'Debugging' },
          { key: 'B', text: 'Halusinasi AI (AI Hallucination)' },
          { key: 'C', text: 'Overfitting' },
          { key: 'D', text: 'Deepfake' }
        ],
        correctAnswer: 'B',
        createdAt: new Date().toISOString(),
      }
    ];

    // Seed registrations
    const registration1: TrainingRegistration = {
      id: 'r-1',
      studentUserId: studentId,
      trainingId: trainingId1,
      registeredAt: new Date().toISOString(),
    };

    // Log action
    const audit1: AdminAuditLog = {
      id: 'log-1',
      adminUserId: adminId,
      action: 'SYSTEM_SEED',
      details: 'Sistem berjaya di-seed dengan data latihan asas dan soalan kesedaran siber.',
      createdAt: new Date().toISOString(),
    };

    this.data.users.push(adminUser, studentUser);
    this.data.studentProfiles.push(studentProfile);
    this.data.trainings.push(training1, training2);
    this.data.questions.push(...questions, ...questions2);
    this.data.trainingRegistrations.push(registration1);
    this.data.adminAuditLogs.push(audit1);
  }

  // Getters & Setters
  public getUsers(): User[] {
    return this.data.users;
  }

  public getStudentProfiles(): StudentProfile[] {
    return this.data.studentProfiles;
  }

  public getTrainings(): Training[] {
    return this.data.trainings;
  }

  public getQuestions(): Question[] {
    return this.data.questions;
  }

  public getTrainingRegistrations(): TrainingRegistration[] {
    return this.data.trainingRegistrations;
  }

  public getQuizAttempts(): QuizAttempt[] {
    return this.data.quizAttempts;
  }

  public getStudentAnswers(): StudentAnswer[] {
    return this.data.studentAnswers;
  }

  public getCertificates(): Certificate[] {
    return this.data.certificates;
  }

  public getAdminAuditLogs(): AdminAuditLog[] {
    return this.data.adminAuditLogs;
  }

  // Add Methods
  public addUser(user: User) {
    this.data.users.push(user);
    this.save();
  }

  public addStudentProfile(profile: StudentProfile) {
    this.data.studentProfiles.push(profile);
    this.save();
  }

  public updateStudentProfile(userId: string, updated: Partial<StudentProfile>) {
    const idx = this.data.studentProfiles.findIndex(p => p.userId === userId);
    if (idx !== -1) {
      this.data.studentProfiles[idx] = {
        ...this.data.studentProfiles[idx],
        ...updated,
        updatedAt: new Date().toISOString()
      };
      this.save();
    }
  }

  public addTraining(training: Training) {
    this.data.trainings.push(training);
    this.save();
  }

  public updateTraining(id: string, updated: Partial<Training>) {
    const idx = this.data.trainings.findIndex(t => t.id === id);
    if (idx !== -1) {
      this.data.trainings[idx] = { ...this.data.trainings[idx], ...updated };
      this.save();
    }
  }

  public addQuestion(question: Question) {
    this.data.questions.push(question);
    this.save();
  }

  public deleteQuestionsForTraining(trainingId: string) {
    this.data.questions = this.data.questions.filter(q => q.trainingId !== trainingId);
    this.save();
  }

  public addTrainingRegistration(reg: TrainingRegistration) {
    this.data.trainingRegistrations.push(reg);
    this.save();
  }

  public addQuizAttempt(attempt: QuizAttempt) {
    this.data.quizAttempts.push(attempt);
    this.save();
  }

  public updateQuizAttempt(id: string, updated: Partial<QuizAttempt>) {
    const idx = this.data.quizAttempts.findIndex(a => a.id === id);
    if (idx !== -1) {
      this.data.quizAttempts[idx] = { ...this.data.quizAttempts[idx], ...updated };
      this.save();
    }
  }

  public addStudentAnswer(ans: StudentAnswer) {
    // Prevent duplicated answers for the same question in the same attempt
    const idx = this.data.studentAnswers.findIndex(a => a.attemptId === ans.attemptId && a.questionId === ans.questionId);
    if (idx !== -1) {
      this.data.studentAnswers[idx] = ans;
    } else {
      this.data.studentAnswers.push(ans);
    }
    this.save();
  }

  public addCertificate(cert: Certificate) {
    this.data.certificates.push(cert);
    this.save();
  }

  public addAdminAuditLog(log: AdminAuditLog) {
    this.data.adminAuditLogs.push(log);
    this.save();
  }
}

export const db = new Database();
