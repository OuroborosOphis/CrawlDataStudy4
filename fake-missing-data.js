const fs = require('fs');

// Đọc file JSON
const data = JSON.parse(fs.readFileSync('./toeic_full_part_and_result.json', 'utf8'));

// Fake data helpers
function randomAnswer() {
  const options = ['A', 'B', 'C', 'D'];
  return options[Math.floor(Math.random() * options.length)];
}

function fakeExplanation(questionText, correctAnswer) {
  const templates = [
    `Đáp án đúng là ${correctAnswer}. Câu hỏi kiểm tra khả năng hiểu ngữ cảnh và từ vựng phù hợp.`,
    `Chọn ${correctAnswer} vì đây là đáp án phù hợp nhất với ngữ cảnh của câu hỏi.`,
    `${correctAnswer} là đáp án chính xác. Các đáp án khác không phù hợp về ngữ pháp hoặc ngữ nghĩa.`,
    `Đáp án ${correctAnswer} phù hợp nhất với cấu trúc câu và ý nghĩa của đoạn văn.`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

function fakeTranscript(partNumber, questionNumber) {
  const templates = {
    1: `Look at the picture. A person is standing near the desk. There are some papers on the table.`,
    2: `Question: When will the meeting start? Answer: It will start at 2 PM.`,
    3: `Man: Good morning. I'd like to schedule an appointment. Woman: Sure, what time works best for you?`,
    4: `This is an announcement about the upcoming company event. Please mark your calendars for next Friday.`,
  };
  
  if (partNumber <= 4) {
    return templates[partNumber] || `Audio transcript for question ${questionNumber} - Part ${partNumber}`;
  }
  return null; // Part 5-7 không cần transcript
}

let updatedCount = 0;

// Process tất cả parts
data.parts.forEach((part, partIdx) => {
  const partNumber = parseInt(part.partName.match(/\d+/)?.[0] || 0);
  
  // Part có groups
  if (part.groups) {
    part.groups.forEach(group => {
      // Fake groupTranscript nếu null
      if (!group.groupTranscript && partNumber <= 4) {
        group.groupTranscript = fakeTranscript(partNumber, group.questions[0]?.number || 1);
        updatedCount++;
      }
      
      // Fake data cho từng question trong group
      group.questions.forEach(q => {
        if (!q.correctAnswer) {
          q.correctAnswer = randomAnswer();
          updatedCount++;
        }
        if (!q.explanation) {
          q.explanation = fakeExplanation(q.questionText, q.correctAnswer);
          updatedCount++;
        }
      });
    });
  }
  
  // Part không có groups
  if (part.questions) {
    part.questions.forEach(q => {
      if (!q.correctAnswer) {
        q.correctAnswer = randomAnswer();
        updatedCount++;
      }
      if (!q.explanation) {
        q.explanation = fakeExplanation(q.questionText, q.correctAnswer);
        updatedCount++;
      }
      if (!q.transcript && partNumber <= 4) {
        q.transcript = fakeTranscript(partNumber, q.number);
        updatedCount++;
      }
    });
  }
});

// Lưu lại file
fs.writeFileSync(
  './toeic_full_part_and_result.json',
  JSON.stringify(data, null, 2),
  'utf8'
);

console.log(`✅ Đã fake ${updatedCount} fields, lưu lại vào toeic_full_part_and_result.json`);
console.log(`📊 Tổng số parts: ${data.parts.length}`);
