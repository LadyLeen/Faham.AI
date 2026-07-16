import mammoth from 'mammoth';

interface ParsedQuestion {
  questionText: string;
  options: { key: 'A' | 'B' | 'C' | 'D'; text: string }[];
  correctAnswer: 'A' | 'B' | 'C' | 'D';
}

export async function parseDocxQuiz(buffer: Buffer): Promise<ParsedQuestion[]> {
  const result = await mammoth.extractRawText({ buffer });
  const rawText = result.value;

  if (!rawText || rawText.trim() === '') {
    throw new Error('Sila muat naik fail DOCX yang mengandungi teks soalan.');
  }

  const questions: ParsedQuestion[] = [];
  
  // Split content by paragraphs/newlines
  const lines = rawText.split(/\r?\n/).map(line => line.trim()).filter(line => line !== '');

  let currentQuestionText = '';
  let currentOptions: { key: 'A' | 'B' | 'C' | 'D'; text: string }[] = [];
  let currentCorrectAnswer: 'A' | 'B' | 'C' | 'D' | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if it's an option: A. text, B. text, etc.
    const optionMatch = line.match(/^([A-D])\.\s*(.*)/i);
    // Check if it specifies the answer: "Jawapan: A", "Answer: A", "JAWAPAN:A"
    const answerMatch = line.match(/^(Jawapan|Answer|Ans|Jwb):\s*([A-D])/i);

    if (optionMatch) {
      const key = optionMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
      const text = optionMatch[2].trim();
      currentOptions.push({ key, text });
    } else if (answerMatch) {
      currentCorrectAnswer = answerMatch[2].toUpperCase() as 'A' | 'B' | 'C' | 'D';
      
      // Since "Jawapan" marks the end of a single question block, let's assemble it!
      if (currentQuestionText && currentOptions.length >= 2 && currentCorrectAnswer) {
        // Clean question text from numbers at the start (e.g. "1. Apakah..." -> "Apakah...")
        const cleanedQuestion = currentQuestionText.replace(/^\d+\.\s*/, '').trim();

        // Ensure we don't have duplicated keys in options, sort options by key
        const sortedOptions = currentOptions
          .filter((opt, index, self) => self.findIndex(o => o.key === opt.key) === index)
          .sort((a, b) => a.key.localeCompare(b.key));

        questions.push({
          questionText: cleanedQuestion,
          options: sortedOptions as any,
          correctAnswer: currentCorrectAnswer,
        });

        // Reset for the next question block
        currentQuestionText = '';
        currentOptions = [];
        currentCorrectAnswer = null;
      }
    } else {
      // If it's not an option and not an answer, it must be the question text or a continuation.
      // If we already have options, and then see a new text, it might mean the previous question didn't have a "Jawapan" line or we are starting a new block.
      if (currentOptions.length > 0 && currentQuestionText) {
        // We hit a new question text block without a designated "Jawapan", meaning the previous block was incomplete or skipped.
        // We'll reset options and set the new question text
        currentQuestionText = line;
        currentOptions = [];
        currentCorrectAnswer = null;
      } else {
        // Append to existing question text
        if (currentQuestionText === '') {
          currentQuestionText = line;
        } else {
          currentQuestionText += ' ' + line;
        }
      }
    }
  }

  // Fallback for the last question block if there was no "Jawapan" line but it ended (though "Jawapan" is required)
  if (currentQuestionText && currentOptions.length >= 2 && currentCorrectAnswer) {
    const cleanedQuestion = currentQuestionText.replace(/^\d+\.\s*/, '').trim();
    const sortedOptions = currentOptions
      .filter((opt, index, self) => self.findIndex(o => o.key === opt.key) === index)
      .sort((a, b) => a.key.localeCompare(b.key));

    questions.push({
      questionText: cleanedQuestion,
      options: sortedOptions as any,
      correctAnswer: currentCorrectAnswer,
    });
  }

  if (questions.length === 0) {
    throw new Error('Gagal mengekstrak sebarang soalan. Sila pastikan format mengikut struktur soalan yang betul (A., B., C., D. dan "Jawapan: A").');
  }

  return questions;
}
