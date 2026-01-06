const mysql = require('mysql2/promise');
const fs = require('fs');

// Cấu hình database
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'Allforone@123', // 👈 Sửa password
  database: 'doantotnghiep3', // 👈 Sửa tên database
};

async function insertToDatabase() {
  // 1. Đọc file JSON
  const data = JSON.parse(fs.readFileSync('./toeic_full_part_and_result.json', 'utf8'));
  
  // 2. Kết nối database
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    await connection.beginTransaction();
    
    // 3. Kiểm tra hoặc tạo ExamType
    const [examTypes] = await connection.execute('SELECT ID FROM examtype WHERE Code = ?', ['FULL_TEST']);
    
    let examTypeId;
    if (examTypes.length === 0) {
      console.log('⚠ Chưa có ExamType, đang tạo...');
      const [examTypeResult] = await connection.execute(
        'INSERT INTO examtype (Code, Description) VALUES (?, ?)',
        ['FULL_TEST', 'Complete TOEIC test with all 7 parts (200 questions)']
      );
      examTypeId = examTypeResult.insertId;
      console.log(`✓ Created ExamType ID: ${examTypeId}`);
    } else {
      examTypeId = examTypes[0].ID;
      console.log(`✓ Found ExamType ID: ${examTypeId}`);
    }
    
    // 4. Insert Exam
    const examName = 'New Economy TOEIC Test 1'; // 👈 Sửa tên đề
    const TypeEnum = "FULL_TEST";
    const timeExam = 120; // 120 minutes cho Full Test
    
    const [examResult] = await connection.execute(
      'INSERT INTO exam (Title, TimeExam, Type, ExamTypeID, TimeCreate) VALUES (?, ?, ?, ?, NOW())',
      [examName, timeExam, TypeEnum, examTypeId]
    );
    const examId = examResult.insertId;
    console.log(`✓ Inserted Exam ID: ${examId}`);
    
    // 5. Insert Questions (không cần insert Part vì schema không có bảng Part)
    let questionOrder = 1;
    
    for (const part of data.parts) {
      // Extract part number từ partName (e.g., "Part 1" → 1)
      const partNumber = parseInt(part.partName.match(/\d+/)?.[0] || 0);
      
      console.log(`  Processing ${part.partName}...`);
      
      // Part 1, 2, 5: questions không có group
      if (part.questions) {
        for (const q of part.questions) {
          await insertQuestion(connection, examId, partNumber, q, questionOrder++, {
            audio: q.questionAudio,
            image: q.image,
            transcript: q.transcript,
          });
        }
      }
      
      // Part 3, 4, 6, 7: questions có group
      if (part.groups) {
        for (const group of part.groups) {
          // Insert MediaQuestion (chứa audio/image/passage chung của group)
          const skill = partNumber <= 4 ? 'LISTENING' : 'READING';
          const section = `Part ${partNumber}`;
          
          const [mediaResult] = await connection.execute(
            'INSERT INTO mediaquestion (Skill, Type, Section, AudioUrl, ImageUrl, Scirpt) VALUES (?, ?, ?, ?, ?, ?)',
            [skill, section, section, group.groupAudio, group.image, group.groupTranscript || group.passage]
          );
          const mediaQuestionId = mediaResult.insertId;
          
          for (const q of group.questions) {
            await insertQuestion(connection, examId, partNumber, q, questionOrder++, {
              mediaQuestionId,
            });
          }
        }
      }
    }
    
    await connection.commit();
    console.log(`\n✅ Đã insert thành công ${questionOrder - 1} câu hỏi vào database!`);
    
  } catch (error) {
    await connection.rollback();
    console.error('❌ Lỗi khi insert:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

async function insertQuestion(connection, examId, partNumber, q, order, options = {}) {
  const { audio, image, transcript, mediaQuestionId } = options;
  
  // Nếu question riêng lẻ (Part 1, 2, 5) có audio/image riêng, tạo MediaQuestion
  let finalMediaQuestionId = mediaQuestionId;
  
  if (!mediaQuestionId && (audio || image || transcript)) {
    const skill = partNumber <= 4 ? 'LISTENING' : 'READING';
    const section = `Part ${partNumber}`;
    
    const [mediaResult] = await connection.execute(
      'INSERT INTO mediaquestion (Skill, Type, Section, AudioUrl, ImageUrl, Scirpt) VALUES (?, ?, ?, ?, ?, ?)',
      [skill, section, section, audio, image, transcript]
    );
    finalMediaQuestionId = mediaResult.insertId;
  }
  
  // Insert Question
  const [questionResult] = await connection.execute(
    `INSERT INTO question 
     (ExamID, MediaQuestionID, QuestionText, \`Explain\`, OrderInGroup) 
     VALUES (?, ?, ?, ?, ?)`,
    [
      examId,
      finalMediaQuestionId || null,
      q.questionText || '',
      q.explanation || null,
      order,
    ]
  );
  const questionId = questionResult.insertId;
  
  // Insert Choices (schema: Content, Attribute, IsCorrect)
  for (const ans of q.answers) {
    const isCorrect = ans.option === q.correctAnswer ? 1 : 0;
    
    try {
      const [choiceResult] = await connection.execute(
        'INSERT INTO choice (QuestionID, Content, Attribute, IsCorrect) VALUES (?, ?, ?, ?)',
        [questionId, ans.text, ans.option, isCorrect]
      );
      console.log(`      ✓ Choice ${ans.option} (ID: ${choiceResult.insertId}, IsCorrect: ${isCorrect})`);
    } catch (error) {
      console.error(`      ✗ Failed to insert choice ${ans.option}:`, error.message);
      throw error;
    }
  }
  
  // Insert ExamQuestion junction table
  await connection.execute(
    'INSERT INTO exam_question (ExamID, QuestionID, OrderIndex, MediaQuestionID, IsGrouped) VALUES (?, ?, ?, ?, ?)',
    [examId, questionId, order, finalMediaQuestionId || null, !!mediaQuestionId]
      );
  
  console.log(`    ✓ Question ${q.number} (ID: ${questionId})`);
}

// Run
insertToDatabase().catch(console.error);
