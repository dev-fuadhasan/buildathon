/**
 * Medical Knowledge Base for MomsCare
 * Contains WHO/DGHS guidelines and evidence-based pregnancy information
 * This serves as a foundation for RAG (Retrieval-Augmented Generation)
 */

export type MedicalGuideline = {
  id: string;
  category: string;
  topic: string;
  content: string;
  source: "WHO" | "DGHS" | "Evidence-Based";
  trimester?: "first" | "second" | "third" | "all";
  priority: "high" | "medium" | "low";
};

/**
 * Core medical knowledge base with WHO/DGHS guidelines
 * In a production system, this would be stored in a vector database for RAG
 */
export const MEDICAL_KNOWLEDGE_BASE: MedicalGuideline[] = [
  // Prenatal Care Schedule
  {
    id: "prenatal-1",
    category: "Prenatal Care",
    topic: "Antenatal Care Schedule",
    content: "WHO recommends at least 8 antenatal care contacts: first contact at 12 weeks, then at 20, 26, 30, 34, 36, 38, and 40 weeks. DGHS Bangladesh follows similar guidelines with emphasis on early registration and regular checkups.",
    source: "WHO",
    trimester: "all",
    priority: "high",
  },
  
  // Nutrition
  {
    id: "nutrition-1",
    category: "Nutrition",
    topic: "Pregnancy Nutrition",
    content: "Pregnant women need 300-500 extra calories per day. Essential nutrients include: folic acid (400-800 mcg), iron (27 mg), calcium (1000 mg), protein (71 g), and omega-3 fatty acids. Avoid raw fish, unpasteurized dairy, and excessive caffeine.",
    source: "WHO",
    trimester: "all",
    priority: "high",
  },
  
  {
    id: "nutrition-2",
    category: "Nutrition",
    topic: "Anemia Prevention",
    content: "Iron-deficiency anemia is common in pregnancy. WHO recommends daily iron supplementation (30-60 mg) for all pregnant women. Include iron-rich foods: lean meat, beans, lentils, spinach, and fortified cereals. Take with vitamin C for better absorption.",
    source: "WHO",
    trimester: "all",
    priority: "high",
  },
  
  // Danger Signs
  {
    id: "danger-1",
    category: "Danger Signs",
    topic: "Emergency Symptoms",
    content: "Seek immediate medical care for: severe abdominal pain, heavy vaginal bleeding, severe headache with vision changes, high fever, reduced fetal movement, water breaking before 37 weeks, seizures, or difficulty breathing.",
    source: "WHO",
    trimester: "all",
    priority: "critical",
  },
  
  // Trimester-Specific
  {
    id: "trimester-1",
    category: "First Trimester",
    topic: "Early Pregnancy Care",
    content: "First trimester (0-12 weeks): Focus on folic acid supplementation, avoiding harmful substances, managing morning sickness, and early ultrasound. Common symptoms: nausea, fatigue, breast tenderness. Report severe vomiting or bleeding immediately.",
    source: "WHO",
    trimester: "first",
    priority: "high",
  },
  
  {
    id: "trimester-2",
    category: "Second Trimester",
    topic: "Mid-Pregnancy",
    content: "Second trimester (13-27 weeks): Usually the most comfortable period. Fetal movement typically felt around 18-22 weeks. Important tests: anatomy scan (18-22 weeks), glucose screening (24-28 weeks). Continue prenatal vitamins and regular checkups.",
    source: "WHO",
    trimester: "second",
    priority: "high",
  },
  
  {
    id: "trimester-3",
    category: "Third Trimester",
    topic: "Late Pregnancy",
    content: "Third trimester (28-40 weeks): Monitor fetal movement daily. Watch for signs of preterm labor. Prepare for delivery. Common concerns: back pain, swelling, shortness of breath. Report reduced movement, contractions, or water breaking immediately.",
    source: "WHO",
    trimester: "third",
    priority: "high",
  },
  
  // Common Conditions
  {
    id: "condition-1",
    category: "Common Conditions",
    topic: "Gestational Diabetes",
    content: "Gestational diabetes affects 2-10% of pregnancies. Risk factors: age >25, family history, obesity. Screening at 24-28 weeks. Management: diet, exercise, blood sugar monitoring, sometimes medication. Increases risk of large baby and cesarean delivery.",
    source: "WHO",
    trimester: "second",
    priority: "high",
  },
  
  {
    id: "condition-2",
    category: "Common Conditions",
    topic: "Preeclampsia",
    content: "Preeclampsia: high blood pressure + protein in urine after 20 weeks. Symptoms: severe headache, vision changes, upper abdominal pain, swelling. Risk factors: first pregnancy, age extremes, multiple pregnancy, pre-existing hypertension. Requires immediate medical attention.",
    source: "WHO",
    trimester: "third",
    priority: "critical",
  },
  
  // Exercise
  {
    id: "exercise-1",
    category: "Physical Activity",
    topic: "Pregnancy Exercise",
    content: "WHO recommends 150 minutes of moderate-intensity exercise per week during pregnancy. Safe activities: walking, swimming, prenatal yoga, stationary cycling. Avoid contact sports, activities with fall risk, and scuba diving. Stop if experiencing dizziness, chest pain, or contractions.",
    source: "WHO",
    trimester: "all",
    priority: "medium",
  },
  
  // Mental Health
  {
    id: "mental-1",
    category: "Mental Health",
    topic: "Pregnancy Mental Health",
    content: "Pregnancy can increase risk of depression and anxiety. Symptoms: persistent sadness, loss of interest, excessive worry, sleep problems. Seek help from healthcare provider. Support groups and counseling can help. Untreated depression affects both mother and baby.",
    source: "WHO",
    trimester: "all",
    priority: "high",
  },
  
  // Vaccinations
  {
    id: "vaccine-1",
    category: "Immunization",
    topic: "Pregnancy Vaccines",
    content: "Recommended during pregnancy: Tdap (tetanus, diphtheria, pertussis) and flu vaccine. COVID-19 vaccine recommended. Avoid live vaccines (MMR, varicella). Vaccines protect both mother and baby from serious infections.",
    source: "WHO",
    trimester: "all",
    priority: "high",
  },
  
  // Bangladesh-Specific
  {
    id: "bd-1",
    category: "Bangladesh Context",
    topic: "DGHS Guidelines",
    content: "DGHS Bangladesh emphasizes: early registration (within 12 weeks), regular ANC visits, iron-folic acid supplementation, tetanus toxoid vaccination, and institutional delivery. Community health workers (CHWs) play key role in rural areas.",
    source: "DGHS",
    trimester: "all",
    priority: "high",
  },
];

/**
 * Retrieves relevant medical guidelines based on query
 * In production, this would use vector similarity search
 */
export function retrieveRelevantGuidelines(
  query: string,
  trimester?: number,
  limit: number = 5
): MedicalGuideline[] {
  const queryLower = query.toLowerCase();
  
  // Filter by trimester if provided
  let filtered = MEDICAL_KNOWLEDGE_BASE;
  if (trimester) {
    const trimesterMap: Record<number, "first" | "second" | "third" | "all"> = {
      1: "first",
      2: "second",
      3: "third",
    };
    const trimesterKey = trimesterMap[Math.ceil(trimester / 13)] || "all";
    filtered = MEDICAL_KNOWLEDGE_BASE.filter(
      (g) => g.trimester === trimesterKey || g.trimester === "all"
    );
  }
  
  // Simple keyword matching (in production, use vector embeddings)
  const scored = filtered.map((guideline) => {
    const content = `${guideline.category} ${guideline.topic} ${guideline.content}`.toLowerCase();
    let score = 0;
    
    // Check for keyword matches
    const keywords = queryLower.split(/\s+/);
    keywords.forEach((keyword) => {
      if (content.includes(keyword)) {
        score += 1;
      }
    });
    
    // Boost priority items
    if (guideline.priority === "critical" || guideline.priority === "high") {
      score += 2;
    }
    
    return { guideline, score };
  });
  
  // Sort by score and return top results
  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.guideline);
}

/**
 * Formats guidelines for AI context
 */
export function formatGuidelinesForContext(guidelines: MedicalGuideline[]): string {
  if (guidelines.length === 0) return "";
  
  const formatted = guidelines.map((g) => {
    return `[${g.source}] ${g.topic}:\n${g.content}`;
  }).join("\n\n");
  
  return `\n\nRelevant Medical Guidelines:\n${formatted}`;
}

