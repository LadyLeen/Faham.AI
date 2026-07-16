export interface User {
  id: string;
  email: string;
  role: 'admin' | 'student';
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
  passingScore: number;
  durationMinutes: number;
  maxAttempts: number;
  randomizeQuestions: boolean;
  isActive: boolean;
  createdAt: string;
  // Student specific extensions
  isRegistered?: boolean;
  hasPassed?: boolean;
  remainingAttempts?: number;
  attemptsCount?: number;
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

export interface SanitizedQuestion {
  id: string;
  questionText: string;
  options: {
    key: 'A' | 'B' | 'C' | 'D';
    text: string;
  }[];
  selectedAnswer: 'A' | 'B' | 'C' | 'D' | null;
}

export interface QuizAttempt {
  id: string;
  studentUserId: string;
  trainingId: string;
  attemptNumber: number;
  startTime: string;
  endTime: string | null;
  score: number | null;
  passed: boolean | null;
  totalQuestions: number;
  correctAnswers: number;
  durationSeconds?: number;
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
  certNumber: string;
  issueDate: string;
}

export interface AdminAuditLog {
  id: string;
  adminUserId: string;
  action: string;
  details: string;
  createdAt: string;
}

export interface AdminStats {
  summary: {
    totalStudents: number;
    uniqueStudentsAnswered: number;
    passRate: number;
    avgScore: number;
    avgDuration: number;
  };
  hardestQuestions: {
    text: string;
    trainingName: string;
    count: number;
  }[];
  rankings: {
    studentName: string;
    studentEmail: string;
    organization: string;
    trainingName: string;
    score: number;
    durationSeconds: number;
    attemptNumber: number;
    passed: boolean;
  }[];
  trainingPerformance: {
    id: string;
    name: string;
    registered: number;
    attempts: number;
    passed: number;
    passRate: number;
    avgScore: number;
    isActive: boolean;
  }[];
  availableYears?: string[];
}

export interface ParticipantRegistration {
  studentUserId: string;
  fullName: string;
  studentId: string;
  email: string;
  organization: string;
  registeredAt: string;
  attemptsCount: number;
  bestScore: number | null;
  passed: boolean;
  certificateNumber: string | null;
  attempts: QuizAttempt[];
}
