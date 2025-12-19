/**
 * Script to convert Qn_DS.xlsx to JSON format
 * Run: node scripts/convert-questions-to-json.js
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const excelPath = path.join(process.cwd(), 'Qn_DS.xlsx');
const jsonPath = path.join(process.cwd(), 'questions-dataset.json');

if (!fs.existsSync(excelPath)) {
  console.error('❌ Qn_DS.xlsx not found at:', excelPath);
  process.exit(1);
}

try {
  console.log('Reading Excel file...');
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  if (rows.length < 2) {
    console.error('❌ Excel file is empty or has no data rows');
    process.exit(1);
  }
  
  // Get headers - check if first row looks like headers or data
  const firstRow = rows[0];
  const secondRow = rows[1];
  
  // Check if first row contains header-like text (question_id, category, etc.)
  const firstRowText = firstRow.map(c => String(c || '').toLowerCase()).join(' ');
  const hasHeaderKeywords = firstRowText.includes('question') || firstRowText.includes('category') || firstRowText.includes('id');
  
  let headerRow = 0;
  let dataStartRow = 1;
  
  // If first row doesn't look like headers, check second row
  if (!hasHeaderKeywords && secondRow) {
    const secondRowText = secondRow.map(c => String(c || '').toLowerCase()).join(' ');
    if (secondRowText.includes('question') || secondRowText.includes('category')) {
      headerRow = 1;
      dataStartRow = 2;
    }
  }
  
  const headers = rows[headerRow].map(h => String(h || '').toLowerCase().trim());
  console.log('Headers found:', headers);
  console.log('First data row:', rows[dataStartRow]);
  
  // Find column indices
  const idIndex = headers.findIndex(h => h.includes('question_id') || h.includes('id') || h.includes('no') || h.includes('#'));
  const questionEnIndex = headers.findIndex(h => h.includes('question_en') || (h.includes('question') && (h.includes('en') || h.includes('english') || h.includes('eng'))));
  const questionBnIndex = headers.findIndex(h => h.includes('question_bn') || (h.includes('question') && (h.includes('bn') || h.includes('bangla') || h.includes('bengali'))));
  const categoryIndex = headers.findIndex(h => h.includes('category') || h.includes('type') || h.includes('tag'));
  const riskIndex = headers.findIndex(h => h.includes('severity') || h.includes('risk') || h.includes('indicator') || h.includes('problem'));
  
  // If not found, try common positions
  let enIdx = questionEnIndex >= 0 ? questionEnIndex : 2;
  let bnIdx = questionBnIndex >= 0 ? questionBnIndex : 3;
  let catIdx = categoryIndex >= 0 ? categoryIndex : 1;
  let riskIdx = riskIndex >= 0 ? riskIndex : 5;
  
  console.log(`Using columns - ID: ${idIndex >= 0 ? idIndex : 0}, EN: ${enIdx}, BN: ${bnIdx}, Category: ${catIdx}, Risk: ${riskIdx}`);
  
  // Parse rows (skip header row)
  const questions = rows.slice(dataStartRow)
    .filter(row => row && row.length > 0 && (row[enIdx] || row[bnIdx]))
    .map((row, index) => {
      const id = idIndex >= 0 && row[idIndex] ? String(row[idIndex]) : `q${index + 1}`;
      const question_en = row[enIdx] ? String(row[enIdx]).trim() : '';
      const question_bn = row[bnIdx] ? String(row[bnIdx]).trim() : '';
      const category = catIdx >= 0 && row[catIdx] ? String(row[catIdx]).trim() : undefined;
      const riskIndicator = riskIdx >= 0 && row[riskIdx] ? String(row[riskIdx]).trim() : undefined;
      
      return {
        id,
        question_en,
        question_bn,
        category,
        riskIndicator,
      };
    })
    .filter(q => q.question_en || q.question_bn);
  
  // Save to JSON
  fs.writeFileSync(jsonPath, JSON.stringify(questions, null, 2), 'utf-8');
  
  console.log(`✅ Successfully converted ${questions.length} questions to JSON`);
  console.log(`📁 Saved to: ${jsonPath}`);
  console.log(`\nSample questions:`);
  questions.slice(0, 3).forEach((q, i) => {
    console.log(`\n${i + 1}. ID: ${q.id}`);
    console.log(`   EN: ${q.question_en.substring(0, 60)}...`);
    console.log(`   BN: ${q.question_bn.substring(0, 60)}...`);
  });
  
} catch (error) {
  console.error('❌ Error converting Excel to JSON:', error);
  process.exit(1);
}

