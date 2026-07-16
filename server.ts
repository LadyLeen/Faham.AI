import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { db, hashPassword, User, StudentProfile, Training, Question, TrainingRegistration, QuizAttempt, StudentAnswer, Certificate, AdminAuditLog } from './server/db.js';
import { parseDocxQuiz } from './server/parser.js';

// We use relative ESM imports so adding .js is safe, or ESBuild will resolve it correctly.
const app = express();
const PORT = 3000;

// Increase payload limit for base64 docx file uploads
app.use(express.json({ limit: '10mb' }));

// Simple Auth Middleware
function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Sesi anda telah tamat atau tidak sah.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const [userId, role, expires] = decoded.split(':');

    if (new Date(expires) < new Date()) {
      return res.status(401).json({ error: 'Sesi anda telah tamat. Sila log masuk semula.' });
    }

    const user = db.getUsers().find(u => u.id === userId && u.role === role);
    if (!user) {
      return res.status(401).json({ error: 'Pengguna tidak ditemui.' });
    }

    (req as any).user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token sesi tidak sah.' });
  }
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user as User;
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Akses dinafikan. Anda bukan Admin.' });
  }
  next();
}

// Generate Simple Token helper
function generateToken(user: User): string {
  const expires = new Date();
  expires.setHours(expires.getHours() + 24); // 24 Hours validity
  const tokenString = `${user.id}:${user.role}:${expires.toISOString()}`;
  return Buffer.from(tokenString, 'utf8').toString('base64');
}

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

app.post('/api/auth/register', (req, res) => {
  const { email, password, fullName, studentId, organization } = req.body;

  if (!email || !password || !fullName || !studentId || !organization) {
    return res.status(400).json({ error: 'Sila lengkapkan semua butiran pendaftaran.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = db.getUsers().find(u => u.email === normalizedEmail);
  if (existingUser) {
    return res.status(400).json({ error: 'E-mel ini telah didaftarkan dalam sistem.' });
  }

  const userId = `u-${crypto.randomUUID()}`;
  const newUser: User = {
    id: userId,
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    role: 'student',
    createdAt: new Date().toISOString(),
  };

  const newProfile: StudentProfile = {
    id: `p-${crypto.randomUUID()}`,
    userId: userId,
    fullName: fullName.trim(),
    studentId: studentId.trim(),
    email: normalizedEmail,
    organization: organization.trim(),
    updatedAt: new Date().toISOString(),
  };

  db.addUser(newUser);
  db.addStudentProfile(newProfile);

  const token = generateToken(newUser);
  res.status(201).json({
    token,
    user: { id: newUser.id, email: newUser.email, role: newUser.role },
    profile: newProfile
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Sila masukkan e-mel dan kata laluan.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = db.getUsers().find(u => u.email === normalizedEmail);

  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ error: 'E-mel atau kata laluan tidak betul.' });
  }

  const token = generateToken(user);
  const profile = db.getStudentProfiles().find(p => p.userId === user.id);

  res.json({
    token,
    user: { id: user.id, email: user.email, role: user.role },
    profile: profile || null
  });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  const user = (req as any).user as User;
  const profile = db.getStudentProfiles().find(p => p.userId === user.id);
  res.json({
    user: { id: user.id, email: user.email, role: user.role },
    profile: profile || null
  });
});

app.put('/api/auth/profile', authenticate, (req, res) => {
  const user = (req as any).user as User;
  const { fullName, studentId, organization } = req.body;

  if (!fullName || !studentId || !organization) {
    return res.status(400).json({ error: 'Sila lengkapkan profil anda.' });
  }

  db.updateStudentProfile(user.id, {
    fullName: fullName.trim(),
    studentId: studentId.trim(),
    organization: organization.trim(),
  });

  const updatedProfile = db.getStudentProfiles().find(p => p.userId === user.id);
  res.json({ success: true, profile: updatedProfile });
});

// ==========================================
// TRAINING ENDPOINTS
// ==========================================
// Helper to automatically close and grade expired attempts for a student
function autoCloseExpiredAttemptsForUser(userId: string) {
  const attempts = db.getQuizAttempts().filter(a => a.studentUserId === userId && a.endTime === null);
  const trainings = db.getTrainings();
  const now = new Date().getTime();

  attempts.forEach(attempt => {
    const training = trainings.find(t => t.id === attempt.trainingId);
    if (!training) return;

    const startTime = new Date(attempt.startTime).getTime();
    const elapsedMinutes = (now - startTime) / 60000;

    if (elapsedMinutes > training.durationMinutes) {
      const questions = db.getQuestions().filter(q => q.trainingId === attempt.trainingId);
      const answers = db.getStudentAnswers().filter(a => a.attemptId === attempt.id);

      let correctAnswersCount = 0;
      questions.forEach(q => {
        const studentAns = answers.find(a => a.questionId === q.id);
        if (studentAns && studentAns.selectedOption === q.correctAnswer) {
          correctAnswersCount++;
        }
      });

      const totalQuestions = questions.length;
      const scorePercentage = totalQuestions > 0 ? Math.round((correctAnswersCount / totalQuestions) * 100) : 0;
      const passed = scorePercentage >= training.passingScore;
      const endTime = new Date(startTime + training.durationMinutes * 60000).toISOString();

      db.updateQuizAttempt(attempt.id, {
        endTime,
        score: scorePercentage,
        passed,
        correctAnswers: correctAnswersCount,
        totalQuestions
      });

      // Generate certificate automatically if passed
      if (passed) {
        const existingCert = db.getCertificates().find(c => c.studentUserId === userId && c.trainingId === training.id);
        if (!existingCert) {
          const serial = String(db.getCertificates().length + 1).padStart(4, '0');
          const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
          const certNumber = `FahamAI-${dateStr}-${serial}`;

          db.addCertificate({
            id: `cert-${crypto.randomUUID()}`,
            studentUserId: userId,
            trainingId: training.id,
            attemptId: attempt.id,
            certNumber,
            issueDate: endTime
          });
        }
      }
    }
  });
}

app.get('/api/trainings', authenticate, (req, res) => {
  const user = (req as any).user as User;
  const allTrainings = db.getTrainings();

  if (user.role === 'admin') {
    res.json(allTrainings);
  } else {
    // Auto-close any expired attempts first so remainingAttempts is accurate
    autoCloseExpiredAttemptsForUser(user.id);

    // Only return active trainings for students
    const activeTrainings = allTrainings.filter(t => t.isActive);
    // Include user registration status
    const registrations = db.getTrainingRegistrations().filter(r => r.studentUserId === user.id);
    const trainingsWithStatus = activeTrainings.map(t => {
      const isRegistered = registrations.some(r => r.trainingId === t.id);
      const attempts = db.getQuizAttempts().filter(a => a.studentUserId === user.id && a.trainingId === t.id);
      const hasPassed = attempts.some(a => a.passed === true);
      const remainingAttempts = t.maxAttempts - attempts.length;

      return {
        ...t,
        isRegistered,
        hasPassed,
        remainingAttempts: Math.max(0, remainingAttempts),
        attemptsCount: attempts.length
      };
    });
    res.json(trainingsWithStatus);
  }
});

app.post('/api/trainings', authenticate, requireAdmin, (req, res) => {
  const admin = (req as any).user as User;
  const { name, description, date, location, organizer, trainer, passingScore, durationMinutes, maxAttempts, randomizeQuestions } = req.body;

  if (!name || !description || !date || !location || !organizer || !trainer) {
    return res.status(400).json({ error: 'Sila lengkapkan semua butiran latihan.' });
  }

  const trainingId = `t-${crypto.randomUUID()}`;
  const newTraining: Training = {
    id: trainingId,
    name: name.trim(),
    description: description.trim(),
    date: date,
    location: location.trim(),
    organizer: organizer.trim(),
    trainer: trainer.trim(),
    passingScore: Number(passingScore) || 80,
    durationMinutes: Number(durationMinutes) || 15,
    maxAttempts: Number(maxAttempts) || 3,
    randomizeQuestions: !!randomizeQuestions,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  db.addTraining(newTraining);

  db.addAdminAuditLog({
    id: `log-${crypto.randomUUID()}`,
    adminUserId: admin.id,
    action: 'CREATE_TRAINING',
    details: `Mencipta latihan baru: ${newTraining.name}`,
    createdAt: new Date().toISOString(),
  });

  res.status(201).json(newTraining);
});

app.put('/api/trainings/:id', authenticate, requireAdmin, (req, res) => {
  const admin = (req as any).user as User;
  const { id } = req.params;
  const updateData = req.body;

  const training = db.getTrainings().find(t => t.id === id);
  if (!training) {
    return res.status(404).json({ error: 'Latihan tidak ditemui.' });
  }

  db.updateTraining(id, {
    ...updateData,
    passingScore: updateData.passingScore !== undefined ? Number(updateData.passingScore) : training.passingScore,
    durationMinutes: updateData.durationMinutes !== undefined ? Number(updateData.durationMinutes) : training.durationMinutes,
    maxAttempts: updateData.maxAttempts !== undefined ? Number(updateData.maxAttempts) : training.maxAttempts,
  });

  const updatedTraining = db.getTrainings().find(t => t.id === id);

  db.addAdminAuditLog({
    id: `log-${crypto.randomUUID()}`,
    adminUserId: admin.id,
    action: 'UPDATE_TRAINING',
    details: `Mengemas kini latihan: ${updatedTraining?.name} (Status Aktif: ${updatedTraining?.isActive})`,
    createdAt: new Date().toISOString(),
  });

  res.json(updatedTraining);
});

app.post('/api/trainings/:id/register', authenticate, (req, res) => {
  const user = (req as any).user as User;
  const { id } = req.params;

  const training = db.getTrainings().find(t => t.id === id);
  if (!training || !training.isActive) {
    return res.status(404).json({ error: 'Latihan tidak ditemui atau tidak aktif.' });
  }

  const existingReg = db.getTrainingRegistrations().find(r => r.studentUserId === user.id && r.trainingId === id);
  if (existingReg) {
    return res.status(400).json({ error: 'Anda sudah mendaftar untuk latihan ini.' });
  }

  const newReg: TrainingRegistration = {
    id: `r-${crypto.randomUUID()}`,
    studentUserId: user.id,
    trainingId: id,
    registeredAt: new Date().toISOString(),
  };

  db.addTrainingRegistration(newReg);
  res.json({ success: true, message: 'Pendaftaran berjaya!' });
});

// ==========================================
// DOCX UPLOAD & PROCESS ENDPOINTS
// ==========================================

app.post('/api/admin/trainings/:id/upload-docx', authenticate, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { filename, fileData } = req.body; // fileData is base64 string

  if (!filename || !fileData) {
    return res.status(400).json({ error: 'Tiada fail dimuat naik.' });
  }

  const training = db.getTrainings().find(t => t.id === id);
  if (!training) {
    return res.status(404).json({ error: 'Latihan tidak ditemui.' });
  }

  try {
    const buffer = Buffer.from(fileData, 'base64');
    const parsedQuestions = await parseDocxQuiz(buffer);

    res.json({
      message: `Berjaya mengekstrak ${parsedQuestions.length} soalan dari fail ${filename}. Sila semak kandungan sebelum menyimpan.`,
      questions: parsedQuestions
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Gagal memproses fail DOCX. Sila pastikan format mengikut standard.' });
  }
});

app.post('/api/admin/trainings/:id/save-questions', authenticate, requireAdmin, (req, res) => {
  const admin = (req as any).user as User;
  const { id } = req.params;
  const { questions } = req.body;

  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'Tiada soalan sah dihantar.' });
  }

  const training = db.getTrainings().find(t => t.id === id);
  if (!training) {
    return res.status(404).json({ error: 'Latihan tidak ditemui.' });
  }

  // Delete previous questions first to avoid duplication as per "Mengelakkan soalan pendua"
  db.deleteQuestionsForTraining(id);

  // Insert questions
  questions.forEach((q: any) => {
    db.addQuestion({
      id: `q-${crypto.randomUUID()}`,
      trainingId: id,
      questionText: q.questionText,
      options: q.options,
      correctAnswer: q.correctAnswer,
      createdAt: new Date().toISOString(),
    });
  });

  db.addAdminAuditLog({
    id: `log-${crypto.randomUUID()}`,
    adminUserId: admin.id,
    action: 'SAVE_QUESTIONS',
    details: `Menyimpan ${questions.length} soalan kuiz untuk latihan: ${training.name}`,
    createdAt: new Date().toISOString(),
  });

  res.json({ success: true, count: questions.length });
});

app.get('/api/admin/trainings/:id/questions', authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  const questions = db.getQuestions().filter(q => q.trainingId === id);
  res.json(questions);
});

// GET /api/admin/download-template - Generate and download template DOCX file
app.get('/api/admin/download-template', (req, res) => {
  try {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "TEMPLAT FORMAT SOALAN KUIZ FAHAMAI",
                  bold: true,
                  size: 28,
                }),
              ],
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "Arahan format dokumen Word (.docx):",
                  bold: true,
                }),
              ],
            }),
            new Paragraph({ text: "1. Tulis teks soalan terus pada baris baharu (boleh dimulakan dengan nombor, cth: 1. atau 2.)." }),
            new Paragraph({ text: "2. Pilihan jawapan mestilah menggunakan format huruf besar diikuti dengan tanda noktah (A., B., C., D.) di permulaan baris pilihan." }),
            new Paragraph({ text: "3. Selepas pilihan D., masukkan baris 'Jawapan: [A/B/C/D]' atau 'Answer: [A/B/C/D]' (tidak sensitif huruf besar/kecil) untuk menandakan jawapan yang betul." }),
            new Paragraph({ text: "4. Jarakkan sekurang-kurangnya satu baris kosong di antara soalan-soalan bagi memudahkan proses imbasan fail." }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "CONTOH FORMAT SOALAN KUIZ YANG SAH:",
                  bold: true,
                }),
              ],
            }),
            new Paragraph({ text: "" }),
            
            // Question 1
            new Paragraph({ text: "1. Apakah ibu negara bagi negara Malaysia?" }),
            new Paragraph({ text: "A. George Town" }),
            new Paragraph({ text: "B. Kuala Lumpur" }),
            new Paragraph({ text: "C. Shah Alam" }),
            new Paragraph({ text: "D. Johor Bahru" }),
            new Paragraph({ text: "Jawapan: B" }),
            new Paragraph({ text: "" }),

            // Question 2
            new Paragraph({ text: "2. Berapakah bilangan rukun Islam yang wajib dipercayai oleh setiap Muslim?" }),
            new Paragraph({ text: "A. Lima (5)" }),
            new Paragraph({ text: "B. Enam (6)" }),
            new Paragraph({ text: "C. Empat (4)" }),
            new Paragraph({ text: "D. Tujuh (7)" }),
            new Paragraph({ text: "Jawapan: A" }),
            new Paragraph({ text: "" }),

            // Question 3
            new Paragraph({ text: "3. Yang manakah antara berikut merupakan amalan keselamatan kata laluan yang terbaik?" }),
            new Paragraph({ text: "A. Menggunakan kata laluan yang sama untuk semua akaun" }),
            new Paragraph({ text: "B. Berkongsi kata laluan dengan rakan sekerja rapat" }),
            new Paragraph({ text: "C. Menggunakan kombinasi huruf besar, huruf kecil, nombor, dan simbol khas" }),
            new Paragraph({ text: "D. Menulis kata laluan pada kertas pelekat di atas meja" }),
            new Paragraph({ text: "Jawapan: C" }),
            new Paragraph({ text: "" }),

            // Question 4
            new Paragraph({ text: "4. Apakah fungsi utama teknologi Firewall dalam sesebuah rangkaian komputer?" }),
            new Paragraph({ text: "A. Mempercepatkan kelajuan muat turun fail internet" }),
            new Paragraph({ text: "B. Menapis dan menyekat trafik masuk atau keluar yang tidak dibenarkan" }),
            new Paragraph({ text: "C. Mengesan kerosakan fizikal pada kabel rangkaian" }),
            new Paragraph({ text: "D. Membersihkan skrin monitor daripada habuk" }),
            new Paragraph({ text: "Jawapan: B" }),
          ],
        },
      ],
    });

    Packer.toBuffer(doc).then((buffer) => {
      res.setHeader('Content-Disposition', 'attachment; filename=Templat_Soalan_FahamAI.docx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.send(buffer);
    }).catch((err) => {
      res.status(500).json({ error: 'Gagal menjana fail templat.' });
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Ralat dalaman pelayan.' });
  }
});

// ==========================================
// STUDENT QUIZ RUNTIME ENDPOINTS
// ==========================================

// Get training questions (returns metadata without correct answer, for students during the quiz)
app.get('/api/quizzes/:trainingId/questions', authenticate, (req, res) => {
  const user = (req as any).user as User;
  const { trainingId } = req.params;

  // Auto-close any expired attempts first
  autoCloseExpiredAttemptsForUser(user.id);

  const registration = db.getTrainingRegistrations().find(r => r.studentUserId === user.id && r.trainingId === trainingId);
  if (!registration) {
    return res.status(403).json({ error: 'Anda perlu mendaftar untuk latihan ini sebelum mengambil kuiz.' });
  }

  const training = db.getTrainings().find(t => t.id === trainingId);
  if (!training || !training.isActive) {
    return res.status(404).json({ error: 'Latihan tidak aktif.' });
  }

  const allQuestions = db.getQuestions().filter(q => q.trainingId === trainingId);
  if (allQuestions.length === 0) {
    return res.status(400).json({ error: 'Kuiz untuk latihan ini belum bersedia. Soalan belum dimuat naik.' });
  }

  // Find or start attempt (re-fetch after auto-closing)
  const attempts = db.getQuizAttempts().filter(a => a.studentUserId === user.id && a.trainingId === trainingId);
  const activeAttempt = attempts.find(a => a.endTime === null);

  if (!activeAttempt) {
    return res.status(400).json({ error: 'Sila mulakan percubaan kuiz secara sah terlebih dahulu.' });
  }

  // Check if timer expired
  const startTime = new Date(activeAttempt.startTime);
  const elapsedMinutes = (new Date().getTime() - startTime.getTime()) / 60000;
  if (elapsedMinutes > training.durationMinutes) {
    return res.status(400).json({ error: 'Baki masa menjawab telah tamat.', expired: true });
  }

  // Shuffle questions if training.randomizeQuestions is enabled
  let questionsToReturn = [...allQuestions];
  if (training.randomizeQuestions) {
    // Deterministic shuffle or a simple random seed can be used, but standard randomized list is sufficient
    questionsToReturn.sort(() => 0.5 - Math.random());
  }

  // Get active answers to restore student progress (Auto-save)
  const savedAnswers = db.getStudentAnswers().filter(sa => sa.attemptId === activeAttempt.id);

  // Strip correct answer for security
  const sanitizedQuestions = questionsToReturn.map(q => {
    const savedAnswer = savedAnswers.find(sa => sa.questionId === q.id);
    return {
      id: q.id,
      questionText: q.questionText,
      options: q.options,
      selectedAnswer: savedAnswer ? savedAnswer.selectedOption : null
    };
  });

  res.json({
    attemptId: activeAttempt.id,
    durationMinutes: training.durationMinutes,
    startTime: activeAttempt.startTime,
    questions: sanitizedQuestions,
    maxAttempts: training.maxAttempts,
    attemptNumber: activeAttempt.attemptNumber
  });
});

// Start new quiz attempt
app.post('/api/quizzes/:trainingId/start', authenticate, (req, res) => {
  const user = (req as any).user as User;
  const { trainingId } = req.params;

  // Auto-close any expired attempts first
  autoCloseExpiredAttemptsForUser(user.id);

  // 1. Check registration
  const registration = db.getTrainingRegistrations().find(r => r.studentUserId === user.id && r.trainingId === trainingId);
  if (!registration) {
    return res.status(403).json({ error: 'Anda perlu mendaftar untuk latihan ini sebelum mengambil kuiz.' });
  }

  // 2. Check training
  const training = db.getTrainings().find(t => t.id === trainingId);
  if (!training || !training.isActive) {
    return res.status(404).json({ error: 'Latihan tidak aktif.' });
  }

  const allQuestions = db.getQuestions().filter(q => q.trainingId === trainingId);
  if (allQuestions.length === 0) {
    return res.status(400).json({ error: 'Kuiz untuk latihan ini belum bersedia. Soalan belum dimuat naik.' });
  }

  // 3. Check existing attempts (re-fetch to get correct state after auto-closing)
  const attempts = db.getQuizAttempts().filter(a => a.studentUserId === user.id && a.trainingId === trainingId);
  const hasPassed = attempts.some(a => a.passed === true);
  if (hasPassed) {
    return res.status(400).json({ error: 'Anda telah pun LULUS latihan ini dan memperoleh sijil.' });
  }

  // Check active attempt to prevent dual submissions/multiple sessions
  const activeAttempt = attempts.find(a => a.endTime === null);
  if (activeAttempt) {
    // If there is an active attempt, return that instead of creating a new one (session preservation)
    return res.json({ attemptId: activeAttempt.id, restored: true });
  }

  if (attempts.length >= training.maxAttempts) {
    return res.status(400).json({ error: `Had percubaan menjawab telah dicapai (${training.maxAttempts} kali).` });
  }

  // 4. Create new attempt
  const attemptId = `att-${crypto.randomUUID()}`;
  const newAttempt: QuizAttempt = {
    id: attemptId,
    studentUserId: user.id,
    trainingId: trainingId,
    attemptNumber: attempts.length + 1,
    startTime: new Date().toISOString(),
    endTime: null,
    score: null,
    passed: null,
    totalQuestions: allQuestions.length,
    correctAnswers: 0,
  };

  db.addQuizAttempt(newAttempt);
  res.status(201).json({ attemptId, restored: false });
});

// Auto-save answer
app.post('/api/quizzes/attempts/:attemptId/answer', authenticate, (req, res) => {
  const user = (req as any).user as User;
  const { attemptId } = req.params;
  const { questionId, selectedOption } = req.body;

  if (!questionId || !selectedOption) {
    return res.status(400).json({ error: 'Data jawapan tidak mencukupi.' });
  }

  const attempt = db.getQuizAttempts().find(a => a.id === attemptId && a.studentUserId === user.id);
  if (!attempt || attempt.endTime !== null) {
    return res.status(403).json({ error: 'Percubaan kuiz ini tidak aktif atau telah dihantar.' });
  }

  // Validate question and correct answer
  const question = db.getQuestions().find(q => q.id === questionId && q.trainingId === attempt.trainingId);
  if (!question) {
    return res.status(404).json({ error: 'Soalan tidak ditemui.' });
  }

  const isCorrect = question.correctAnswer === selectedOption;

  const studentAnswer: StudentAnswer = {
    id: `ans-${crypto.randomUUID()}`,
    attemptId: attemptId,
    questionId: questionId,
    selectedOption: selectedOption as 'A' | 'B' | 'C' | 'D',
    isCorrect,
    answeredAt: new Date().toISOString()
  };

  db.addStudentAnswer(studentAnswer);
  res.json({ success: true });
});

// Submit entire quiz (calculates exact score from actual database answers, handles server-side time checks)
app.post('/api/quizzes/attempts/:attemptId/submit', authenticate, (req, res) => {
  const user = (req as any).user as User;
  const { attemptId } = req.params;

  const attempt = db.getQuizAttempts().find(a => a.id === attemptId && a.studentUserId === user.id);
  if (!attempt || attempt.endTime !== null) {
    return res.status(400).json({ error: 'Sesi kuiz ini sudah dihantar atau tidak sah.' });
  }

  const training = db.getTrainings().find(t => t.id === attempt.trainingId);
  if (!training) {
    return res.status(404).json({ error: 'Latihan tidak ditemui.' });
  }

  // Get all questions to compute server-side correct marks
  const questions = db.getQuestions().filter(q => q.trainingId === attempt.trainingId);
  const answers = db.getStudentAnswers().filter(a => a.attemptId === attempt.id);

  let correctAnswersCount = 0;
  questions.forEach(q => {
    const studentAns = answers.find(a => a.questionId === q.id);
    if (studentAns && studentAns.selectedOption === q.correctAnswer) {
      correctAnswersCount++;
    }
  });

  const totalQuestions = questions.length;
  const scorePercentage = totalQuestions > 0 ? Math.round((correctAnswersCount / totalQuestions) * 100) : 0;
  const passed = scorePercentage >= training.passingScore;

  const endTime = new Date().toISOString();

  db.updateQuizAttempt(attempt.id, {
    endTime,
    score: scorePercentage,
    passed,
    correctAnswers: correctAnswersCount,
    totalQuestions
  });

  // Generate certificate automatically if passed
  let certificate: Certificate | null = null;
  if (passed) {
    // Check if certificate already exists to prevent duplicate cert numbers
    const existingCert = db.getCertificates().find(c => c.studentUserId === user.id && c.trainingId === training.id);
    if (!existingCert) {
      const serial = String(db.getCertificates().length + 1).padStart(4, '0');
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const certNumber = `FahamAI-${dateStr}-${serial}`;

      certificate = {
        id: `cert-${crypto.randomUUID()}`,
        studentUserId: user.id,
        trainingId: training.id,
        attemptId: attempt.id,
        certNumber,
        issueDate: endTime
      };
      db.addCertificate(certificate);
    } else {
      certificate = existingCert;
    }
  }

  res.json({
    success: true,
    result: {
      attemptId: attempt.id,
      score: scorePercentage,
      passed,
      correctAnswers: correctAnswersCount,
      totalQuestions,
      hasCertificate: passed,
      certNumber: certificate?.certNumber || null
    }
  });
});

app.get('/api/quizzes/attempts/:attemptId/result', authenticate, (req, res) => {
  const user = (req as any).user as User;
  const { attemptId } = req.params;

  const attempt = db.getQuizAttempts().find(a => a.id === attemptId);
  if (!attempt) {
    return res.status(404).json({ error: 'Keputusan kuiz tidak ditemui.' });
  }

  // Authorization check: student can only view their own; admins can view all.
  if (user.role !== 'admin' && attempt.studentUserId !== user.id) {
    return res.status(403).json({ error: 'Akses dinafikan.' });
  }

  const training = db.getTrainings().find(t => t.id === attempt.trainingId);
  const questions = db.getQuestions().filter(q => q.trainingId === attempt.trainingId);
  const answers = db.getStudentAnswers().filter(a => a.attemptId === attempt.id);
  const student = db.getStudentProfiles().find(p => p.userId === attempt.studentUserId);

  const durationSec = attempt.endTime 
    ? Math.max(0, Math.round((new Date(attempt.endTime).getTime() - new Date(attempt.startTime).getTime()) / 1000))
    : 0;

  // Compile detailed questions review (including choices, correct, and selected options)
  const review = questions.map(q => {
    const studentAns = answers.find(ans => ans.questionId === q.id);
    return {
      id: q.id,
      questionText: q.questionText,
      options: q.options,
      correctAnswer: q.correctAnswer,
      selectedAnswer: studentAns ? studentAns.selectedOption : null,
      isCorrect: studentAns ? studentAns.selectedOption === q.correctAnswer : false
    };
  });

  const cert = db.getCertificates().find(c => c.attemptId === attempt.id);

  res.json({
    attempt: {
      ...attempt,
      durationSeconds: durationSec
    },
    training,
    student,
    certNumber: cert?.certNumber || null,
    review
  });
});

// Get user training and quiz attempt history
app.get('/api/students/history', authenticate, (req, res) => {
  const user = (req as any).user as User;

  // Auto-close any expired attempts first
  autoCloseExpiredAttemptsForUser(user.id);

  const attempts = db.getQuizAttempts().filter(a => a.studentUserId === user.id);
  const registrations = db.getTrainingRegistrations().filter(r => r.studentUserId === user.id);
  const certificates = db.getCertificates().filter(c => c.studentUserId === user.id);

  const history = registrations.map(reg => {
    const training = db.getTrainings().find(t => t.id === reg.trainingId);
    const regAttempts = attempts.filter(a => a.trainingId === reg.trainingId).sort((a, b) => b.attemptNumber - a.attemptNumber);
    const passAttempt = regAttempts.find(a => a.passed === true);
    const cert = certificates.find(c => c.trainingId === reg.trainingId);

    return {
      training,
      registeredAt: reg.registeredAt,
      attempts: regAttempts.map(a => {
        const durationSec = a.endTime 
          ? Math.max(0, Math.round((new Date(a.endTime).getTime() - new Date(a.startTime).getTime()) / 1000))
          : 0;
        return {
          ...a,
          durationSeconds: durationSec
        };
      }),
      hasPassed: !!passAttempt,
      certificate: cert || null
    };
  });

  res.json(history);
});

// ==========================================
// CERTIFICATE VERIFICATION (PUBLIC ROUTE)
// ==========================================

app.get('/api/certificates/verify/:certNumber', (req, res) => {
  const { certNumber } = req.params;
  const cert = db.getCertificates().find(c => c.certNumber.toLowerCase() === certNumber.toLowerCase());

  if (!cert) {
    return res.status(404).json({ error: 'Sijil digital tidak sah atau tidak wujud dalam pangkalan data FahamAI.' });
  }

  const student = db.getStudentProfiles().find(p => p.userId === cert.studentUserId);
  const training = db.getTrainings().find(t => t.id === cert.trainingId);
  const attempt = db.getQuizAttempts().find(a => a.id === cert.attemptId);

  res.json({
    valid: true,
    certNumber: cert.certNumber,
    issueDate: cert.issueDate,
    studentName: student?.fullName || 'N/A',
    studentId: student?.studentId || 'N/A',
    organization: student?.organization || 'N/A',
    trainingName: training?.name || 'N/A',
    passingScore: training?.passingScore || 80,
    score: attempt?.score || 100,
    organizer: training?.organizer || 'N/A',
    trainer: training?.trainer || 'N/A'
  });
});

// ==========================================
// ADMIN ANALYTICS & DASHBOARD ENDPOINTS
// ==========================================

app.get('/api/admin/stats', authenticate, requireAdmin, (req, res) => {
  const { year } = req.query;

  let trainings = db.getTrainings();
  let allAttempts = db.getQuizAttempts().filter(a => a.endTime !== null);
  let registrations = db.getTrainingRegistrations();
  let students = db.getStudentProfiles();

  if (year && year !== 'all') {
    const yearStr = String(year);
    // Filter trainings by date year
    trainings = trainings.filter(t => t.date && t.date.startsWith(yearStr));
    
    // Filter attempts to those corresponding to the filtered trainings
    const trainingIdsInYear = new Set(trainings.map(t => t.id));
    allAttempts = allAttempts.filter(a => trainingIdsInYear.has(a.trainingId));
    
    // Filter registrations to those in the filtered trainings
    registrations = registrations.filter(r => trainingIdsInYear.has(r.trainingId));
    
    // Filter students to those who registered for any training of that year
    const registeredStudentUserIds = new Set(registrations.map(r => r.studentUserId));
    students = students.filter(s => registeredStudentUserIds.has(s.userId));
  }

  // 1. Total Registered Students across any training
  const totalStudents = students.length;

  // 2. Total students that have completed at least 1 attempt
  const uniqueStudentsAnswered = new Set(allAttempts.map(a => a.studentUserId)).size;

  // 3. Passing rate
  const totalPassed = allAttempts.filter(a => a.passed === true).length;
  const passRate = allAttempts.length > 0 ? Math.round((totalPassed / allAttempts.length) * 100) : 0;

  // 4. Average score
  const scores = allAttempts.map(a => a.score || 0);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  // 5. Average answering duration (seconds)
  const durations = allAttempts.map(a => {
    if (a.endTime && a.startTime) {
      return (new Date(a.endTime).getTime() - new Date(a.startTime).getTime()) / 1000;
    }
    return 0;
  });
  const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

  // 6. Hardest questions (Most answered incorrectly)
  const answers = db.getStudentAnswers();
  const incorrectCounts: { [qId: string]: { text: string; count: number; trainingName: string } } = {};

  const attemptIdsInScope = new Set(allAttempts.map(a => a.id));

  answers.forEach(ans => {
    if (attemptIdsInScope.has(ans.attemptId) && !ans.isCorrect) {
      if (!incorrectCounts[ans.questionId]) {
        const question = db.getQuestions().find(q => q.id === ans.questionId);
        const training = question ? db.getTrainings().find(t => t.id === question.trainingId) : null;
        incorrectCounts[ans.questionId] = {
          text: question?.questionText || 'Soalan Dipadam',
          trainingName: training?.name || 'N/A',
          count: 0
        };
      }
      incorrectCounts[ans.questionId].count++;
    }
  });

  const hardestQuestions = Object.values(incorrectCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 7. Student Rankings (Global or per training).
  // Criteria: "Bagi menentukan peserta terpantas, utamakan markah tertinggi terlebih dahulu. Jika dua pelajar mempunyai markah yang sama, gunakan tempoh menjawab paling singkat sebagai pemisah."
  const studentRankings = allAttempts.map(att => {
    const student = db.getStudentProfiles().find(p => p.userId === att.studentUserId);
    const training = db.getTrainings().find(t => t.id === att.trainingId);
    const duration = att.endTime && att.startTime 
      ? Math.round((new Date(att.endTime).getTime() - new Date(att.startTime).getTime()) / 1000)
      : 0;

    return {
      studentName: student?.fullName || 'N/A',
      studentEmail: student?.email || 'N/A',
      organization: student?.organization || 'N/A',
      trainingName: training?.name || 'N/A',
      score: att.score || 0,
      durationSeconds: duration,
      attemptNumber: att.attemptNumber,
      passed: att.passed
    };
  })
  .sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score; // Highest mark first
    }
    return a.durationSeconds - b.durationSeconds; // Fastest time first
  });

  // 8. Performance breakdown per training
  const trainingPerformance = trainings.map(t => {
    const tRegs = registrations.filter(r => r.trainingId === t.id).length;
    const tAttempts = allAttempts.filter(a => a.trainingId === t.id);
    const tPassed = tAttempts.filter(a => a.passed === true).length;
    const tPassRate = tAttempts.length > 0 ? Math.round((tPassed / tAttempts.length) * 100) : 0;
    
    const tScores = tAttempts.map(a => a.score || 0);
    const tAvgScore = tScores.length > 0 ? Math.round(tScores.reduce((a, b) => a + b, 0) / tScores.length) : 0;

    return {
      id: t.id,
      name: t.name,
      registered: tRegs,
      attempts: tAttempts.length,
      passed: tPassed,
      passRate: tPassRate,
      avgScore: tAvgScore,
      isActive: t.isActive
    };
  });

  // 9. Extract all unique years from trainings
  const allYears = Array.from(new Set(
    db.getTrainings()
      .map(t => t.date ? t.date.slice(0, 4) : null)
      .filter(Boolean)
  )).sort((a, b) => Number(b) - Number(a)); // Descending order
  
  if (allYears.length === 0) {
    allYears.push(new Date().getFullYear().toString());
  }

  res.json({
    summary: {
      totalStudents,
      uniqueStudentsAnswered,
      passRate,
      avgScore,
      avgDuration
    },
    hardestQuestions,
    rankings: studentRankings,
    trainingPerformance,
    availableYears: allYears
  });
});

app.get('/api/admin/trainings/:trainingId/registrations', authenticate, requireAdmin, (req, res) => {
  const { trainingId } = req.params;

  const training = db.getTrainings().find(t => t.id === trainingId);
  if (!training) {
    return res.status(404).json({ error: 'Latihan tidak ditemui.' });
  }

  const registrations = db.getTrainingRegistrations().filter(r => r.trainingId === trainingId);
  const attempts = db.getQuizAttempts().filter(a => a.trainingId === trainingId);

  const list = registrations.map(reg => {
    const student = db.getStudentProfiles().find(p => p.userId === reg.studentUserId);
    const studentAttempts = attempts.filter(a => a.studentUserId === reg.studentUserId).sort((a, b) => a.attemptNumber - b.attemptNumber);
    const bestAttempt = [...studentAttempts].sort((a, b) => {
      if (b.score !== a.score) return (b.score || 0) - (a.score || 0);
      const durA = a.endTime ? (new Date(a.endTime).getTime() - new Date(a.startTime).getTime()) : 99999999;
      const durB = b.endTime ? (new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) : 99999999;
      return durA - durB;
    })[0];

    const cert = db.getCertificates().find(c => c.studentUserId === reg.studentUserId && c.trainingId === trainingId);

    return {
      studentUserId: reg.studentUserId,
      fullName: student?.fullName || 'N/A',
      studentId: student?.studentId || 'N/A',
      email: student?.email || 'N/A',
      organization: student?.organization || 'N/A',
      registeredAt: reg.registeredAt,
      attemptsCount: studentAttempts.length,
      bestScore: bestAttempt ? bestAttempt.score : null,
      passed: bestAttempt ? bestAttempt.passed : false,
      certificateNumber: cert?.certNumber || null,
      attempts: studentAttempts.map(a => {
        const dur = a.endTime ? Math.max(0, Math.round((new Date(a.endTime).getTime() - new Date(a.startTime).getTime()) / 1000)) : null;
        return {
          ...a,
          durationSeconds: dur
        };
      })
    };
  });

  res.json({
    training,
    participants: list
  });
});

app.get('/api/admin/audit-logs', authenticate, requireAdmin, (req, res) => {
  const logs = db.getAdminAuditLogs().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(logs);
});

// ==========================================
// VITE DEV SERVER AND PRODUCTION SERVING
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FahamAI Server running on port ${PORT}`);
  });
}

startServer();
