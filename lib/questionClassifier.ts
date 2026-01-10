/**
 * Question Classifier - Determines which data sources are needed for a question
 * This runs BEFORE the main AI to filter relevant data
 */

export type DataType = "profile" | "prescriptions" | "daily" | "doctorQA" | "general";

export type QuestionClassification = {
  primary: DataType;
  secondary?: DataType;
};

/**
 * Classify question to determine which data sources to use
 * Uses keyword matching for speed and reliability
 */
export function classifyQuestion(question: string): QuestionClassification {
  const q = question.toLowerCase();
  
  // Personal info questions → ONLY profile
  const personalInfoKeywords = [
    "amar naam", "my name", "নাম",
    "amar phone", "my phone", "phone number", "ফোন", "নম্বর",
    "amar blood", "my blood", "blood group", "রক্ত", "রক্তের গ্রুপ",
    "amar age", "my age", "boyos", "বয়স",
    "amar address", "my address", "thikana", "ঠিকানা",
    "amar email", "my email", "ইমেইল",
    "koto mas", "how many months", "months pregnant", "মাস",
    "koto saptaho", "how many weeks", "weeks pregnant", "সপ্তাহ",
    "koto din", "how many days", "days pregnant", "দিন",
    "medical condition", "amar somossa", "সমস্যা",
    "allergy", "allergies", "অ্যালার্জি",
  ];
  
  for (const keyword of personalInfoKeywords) {
    if (q.includes(keyword)) {
      return { primary: "profile" };
    }
  }
  
  // Prescription/medicine questions → ONLY prescriptions
  const prescriptionKeywords = [
    "kon ousudh", "which medicine", "what medicine", "ঔষধ",
    "prescription", "প্রেসক্রিপশন",
    "medicine name", "ousudher naam", "ঔষধের নাম",
    "dosage", "dose", "ডোজ",
    "tablet", "ট্যাবলেট",
    "capsule", "ক্যাপসুল",
    "doctor prescribe", "dakter lekha", "ডাক্তার",
    "report", "রিপোর্ট", "medical report", "test report", "টেস্ট রিপোর্ট",
    "summary", "সারাংশ", "summarize", "analyze", "বিশ্লেষণ",
    "my prescription", "amar prescription", "আমার প্রেসক্রিপশন",
    "my report", "amar report", "আমার রিপোর্ট",
    "prescription summary", "report summary", "রিপোর্ট সারাংশ",
  ];
  
  for (const keyword of prescriptionKeywords) {
    if (q.includes(keyword)) {
      return { primary: "prescriptions" };
    }
  }
  
  // Daily activities/feelings → ONLY daily entries
  const dailyKeywords = [
    "aj ami", "today i", "আজ আমি",
    "aj amar", "today my", "আজ আমার",
    "likhechhi", "wrote", "লিখেছি",
    "ki korechhi", "what did i do", "করেছি",
    "kemon lagche", "how am i feeling", "লাগছে",
    "recent entry", "recent note", "সাম্প্রতিক",
  ];
  
  for (const keyword of dailyKeywords) {
    if (q.includes(keyword)) {
      return { primary: "daily" };
    }
  }
  
  // Doctor advice → ONLY doctor Q&A
  const doctorKeywords = [
    "doctor ki bolse", "what did doctor say", "ডাক্তার কি বলেছে",
    "doctor er poramorsho", "doctor's advice", "পরামর্শ",
    "doctor bolese", "doctor said", "বলেছে",
  ];
  
  for (const keyword of doctorKeywords) {
    if (q.includes(keyword)) {
      return { primary: "doctorQA" };
    }
  }
  
  // Checkup/appointment timing → Profile (for pregnancy week) + General knowledge
  if (q.includes("checkup") || q.includes("চেকআপ") || q.includes("appointment") || 
      (q.includes("kokhon") && (q.includes("doctor") || q.includes("ডাক্তার")))) {
    return { primary: "profile", secondary: "general" };
  }
  
  // Questions about "my prescription" or "my report" → prescriptions
  if (q.includes("my prescription") || q.includes("amar prescription") || 
      q.includes("my report") || q.includes("amar report") ||
      (q.includes("my") && (q.includes("prescription") || q.includes("report"))) ||
      (q.includes("amar") && (q.includes("prescription") || q.includes("report") || q.includes("রিপোর্ট") || q.includes("প্রেসক্রিপশন")))) {
    return { primary: "prescriptions" };
  }
  
  // Questions asking for summary/analysis of prescriptions/reports → prescriptions
  if ((q.includes("summary") || q.includes("summarize") || q.includes("analyze") || q.includes("সারাংশ") || q.includes("বিশ্লেষণ")) &&
      (q.includes("prescription") || q.includes("report") || q.includes("প্রেসক্রিপশন") || q.includes("রিপোর্ট"))) {
    return { primary: "prescriptions" };
  }
  
  // Default: general health question
  return { primary: "general" };
}

/**
 * Filter context based on classification
 * Returns ONLY the data types needed for the question
 */
export function filterContext(
  classification: QuestionClassification,
  allData: {
    profile?: string;
    prescriptions?: string[];
    daily?: string;
    doctorQA?: string;
  }
): {
  filteredProfile?: string;
  filteredPrescriptions?: string[];
  filteredDaily?: string;
  filteredDoctorQA?: string;
} {
  const result: {
    filteredProfile?: string;
    filteredPrescriptions?: string[];
    filteredDaily?: string;
    filteredDoctorQA?: string;
  } = {};
  
  // Include primary data type
  if (classification.primary === "profile" && allData.profile) {
    result.filteredProfile = allData.profile;
  } else if (classification.primary === "prescriptions" && allData.prescriptions && allData.prescriptions.length > 0) {
    result.filteredPrescriptions = allData.prescriptions;
  } else if (classification.primary === "daily" && allData.daily) {
    result.filteredDaily = allData.daily;
  } else if (classification.primary === "doctorQA" && allData.doctorQA) {
    result.filteredDoctorQA = allData.doctorQA;
  } else if (classification.primary === "general") {
    // For general questions, include profile for context if available
    if (allData.profile) {
      result.filteredProfile = allData.profile;
    }
  }
  
  // Include secondary data type if specified
  if (classification.secondary === "profile" && allData.profile && !result.filteredProfile) {
    result.filteredProfile = allData.profile;
  } else if (classification.secondary === "general" && allData.profile && !result.filteredProfile) {
    result.filteredProfile = allData.profile;
  }
  
  return result;
}

