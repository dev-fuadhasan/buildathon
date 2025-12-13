/**
 * Question Dataset Loader for Daily Health Questions
 * Loads questions from questions-dataset.json file (converted from Qn_DS.xlsx)
 * Falls back to Excel file if JSON doesn't exist
 */

import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";

// Question item structure
export interface QuestionItem {
  id: string;
  question_en: string;
  question_bn: string;
  category?: string;
  riskIndicator?: string; // What problem this question might indicate
}

// Global dataset storage
let questionDataset: QuestionItem[] = [];
let isDatasetLoaded = false;

/**
 * Load questions from questions-dataset.json file (preferred) or Qn_DS.xlsx (fallback)
 */
export function loadQuestionDataset(): void {
  if (isDatasetLoaded) {
    console.log("✅ Question dataset already loaded");
    return;
  }

  try {
    // Try to load from JSON first (this will be bundled with the app)
    const jsonPath = path.join(process.cwd(), "questions-dataset.json");
    
    if (fs.existsSync(jsonPath)) {
      console.log("📁 Loading questions from JSON file...");
      const jsonContent = fs.readFileSync(jsonPath, "utf-8");
      questionDataset = JSON.parse(jsonContent);
      isDatasetLoaded = true;
      console.log(`✅ Question dataset loaded from JSON: ${questionDataset.length} questions`);
      return;
    }

    // Fallback to Excel file if JSON doesn't exist
    console.log("⚠️  JSON file not found, trying Excel file...");
    const excelPath = path.join(process.cwd(), "Qn_DS.xlsx");

    if (!fs.existsSync(excelPath)) {
      console.error("❌ Question dataset not found (neither JSON nor Excel):", jsonPath, "or", excelPath);
      return;
    }

    // Read Excel file
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0]; // Get first sheet
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    if (rows.length < 2) {
      console.error("❌ Question dataset is empty or has no headers");
      return;
    }

    // Get headers (first row)
    const headers = rows[0].map((h: any) => String(h || "").toLowerCase().trim());
    
    // Find column indices - match the actual Excel structure
    const idIndex = headers.findIndex(h => h.includes("question_id") || h.includes("id") || h.includes("no") || h.includes("#"));
    const questionEnIndex = headers.findIndex(h => h.includes("question_en") || (h.includes("question") && (h.includes("en") || h.includes("english") || h.includes("eng"))));
    const questionBnIndex = headers.findIndex(h => h.includes("question_bn") || (h.includes("question") && (h.includes("bn") || h.includes("bangla") || h.includes("bengali"))));
    const categoryIndex = headers.findIndex(h => h.includes("category") || h.includes("type") || h.includes("tag"));
    const riskIndex = headers.findIndex(h => h.includes("severity") || h.includes("risk") || h.includes("indicator") || h.includes("problem"));

    // Use detected indices or fallback to common positions
    let enIdx = questionEnIndex >= 0 ? questionEnIndex : 2;
    let bnIdx = questionBnIndex >= 0 ? questionBnIndex : 3;
    let catIdx = categoryIndex >= 0 ? categoryIndex : 1;
    let riskIdx = riskIndex >= 0 ? riskIndex : 5;

    // Parse rows (skip header)
    questionDataset = rows.slice(1)
      .filter(row => row && row.length > 0 && (row[enIdx] || row[bnIdx])) // Filter empty rows
      .map((row, index) => {
        const id = idIndex >= 0 && row[idIndex] ? String(row[idIndex]) : `q${index + 1}`;
        const question_en = row[enIdx] ? String(row[enIdx]).trim() : "";
        const question_bn = row[bnIdx] ? String(row[bnIdx]).trim() : "";
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
      .filter(q => q.question_en || q.question_bn); // Remove items with no questions

    isDatasetLoaded = true;
    console.log(`✅ Question dataset loaded from Excel: ${questionDataset.length} questions`);
    
    // Try to save as JSON for future use
    try {
      fs.writeFileSync(jsonPath, JSON.stringify(questionDataset, null, 2), "utf-8");
      console.log(`💾 Saved questions to JSON for faster loading next time: ${jsonPath}`);
    } catch (saveError) {
      console.warn("⚠️  Could not save JSON file (this is okay):", saveError);
    }
  } catch (error) {
    console.error("❌ Error loading question dataset:", error);
  }
}

/**
 * Get all questions from dataset
 */
export function getAllQuestions(): QuestionItem[] {
  if (!isDatasetLoaded) {
    loadQuestionDataset();
  }
  // If still not loaded, try one more time
  if (!isDatasetLoaded || questionDataset.length === 0) {
    console.warn("Question dataset not loaded, attempting to reload...");
    isDatasetLoaded = false; // Reset flag to force reload
    loadQuestionDataset();
  }
  return [...questionDataset];
}

/**
 * Get a random set of questions (excluding already asked ones)
 */
export function getRandomQuestions(count: number, excludeIds: string[] = []): QuestionItem[] {
  if (!isDatasetLoaded) {
    loadQuestionDataset();
  }

  const available = questionDataset.filter(q => !excludeIds.includes(q.id));
  
  if (available.length === 0) {
    return [];
  }

  // Shuffle and take first N
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Get question by ID
 */
export function getQuestionById(id: string): QuestionItem | null {
  if (!isDatasetLoaded) {
    loadQuestionDataset();
  }
  return questionDataset.find(q => q.id === id) || null;
}

// Auto-load on module import (but don't fail if file not available at build time)
try {
  loadQuestionDataset();
} catch (error) {
  console.warn("Question dataset not loaded at module initialization - will load on first use");
}

