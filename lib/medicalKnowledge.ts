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
  priority: "critical" | "high" | "medium" | "low";
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
  
  // Expanded Ontology: Symptoms
  {
    id: "symptom-1",
    category: "Symptoms",
    topic: "Morning Sickness",
    content: "Nausea and vomiting in early pregnancy affects 70-80% of women. Usually peaks at 9-10 weeks, resolves by 14-16 weeks. Management: small frequent meals, ginger, vitamin B6, avoid triggers. Seek help if severe (hyperemesis gravidarum) with weight loss or dehydration.",
    source: "WHO",
    trimester: "first",
    priority: "medium",
  },
  {
    id: "symptom-2",
    category: "Symptoms",
    topic: "Back Pain",
    content: "Lower back pain affects 50-70% of pregnant women, especially in third trimester. Causes: weight gain, posture changes, hormone relaxation. Management: exercise, proper posture, supportive shoes, heat/cold therapy, massage. Avoid heavy lifting.",
    source: "WHO",
    trimester: "third",
    priority: "medium",
  },
  {
    id: "symptom-3",
    category: "Symptoms",
    topic: "Swelling (Edema)",
    content: "Mild swelling in feet/ankles is normal, especially in third trimester. Concerning if: sudden, severe, in face/hands, with headache/vision changes (preeclampsia sign). Management: elevate feet, stay hydrated, avoid standing long, wear compression stockings.",
    source: "WHO",
    trimester: "third",
    priority: "high",
  },
  {
    id: "symptom-4",
    category: "Symptoms",
    topic: "Shortness of Breath",
    content: "Mild breathlessness is common due to diaphragm pressure from growing uterus. Normal if gradual and mild. Seek immediate care if: sudden, severe, with chest pain, or blue lips (emergency).",
    source: "WHO",
    trimester: "third",
    priority: "medium",
  },
  
  // Expanded Ontology: Nutrition by Trimester
  {
    id: "nutrition-3",
    category: "Nutrition",
    topic: "First Trimester Nutrition",
    content: "First trimester: Focus on folic acid (600-800 mcg) to prevent neural tube defects. Small frequent meals help with nausea. Key foods: leafy greens, citrus fruits, fortified cereals, lean proteins. Avoid: raw fish, unpasteurized dairy, deli meats, high-mercury fish.",
    source: "WHO",
    trimester: "first",
    priority: "high",
  },
  {
    id: "nutrition-4",
    category: "Nutrition",
    topic: "Second Trimester Nutrition",
    content: "Second trimester: Baby's growth accelerates. Increase protein (71g/day), iron (27mg), calcium (1000mg). Include: lean meats, beans, dairy, whole grains, fruits, vegetables. Continue prenatal vitamins. Monitor weight gain (0.5-1 lb/week).",
    source: "WHO",
    trimester: "second",
    priority: "high",
  },
  {
    id: "nutrition-5",
    category: "Nutrition",
    topic: "Third Trimester Nutrition",
    content: "Third trimester: Baby's brain development peaks. Continue high protein, iron, DHA (omega-3). Small frequent meals help with heartburn. Stay hydrated (8-10 glasses water). Monitor for gestational diabetes symptoms.",
    source: "WHO",
    trimester: "third",
    priority: "high",
  },
  
  // Expanded Ontology: Checkup Schedule
  {
    id: "checkup-1",
    category: "Checkup Schedule",
    topic: "First Trimester Checkups",
    content: "First visit (8-12 weeks): Confirm pregnancy, estimate due date, baseline tests (blood, urine, ultrasound), check blood pressure/weight. Screen for genetic conditions if indicated. Discuss lifestyle, nutrition, supplements.",
    source: "WHO",
    trimester: "first",
    priority: "high",
  },
  {
    id: "checkup-2",
    category: "Checkup Schedule",
    topic: "Second Trimester Checkups",
    content: "Second trimester: Monthly visits. Key tests: anatomy scan (18-22 weeks), glucose screening (24-28 weeks), blood pressure monitoring. Check fetal growth, position, heartbeat. Discuss birth plan, breastfeeding preparation.",
    source: "WHO",
    trimester: "second",
    priority: "high",
  },
  {
    id: "checkup-3",
    category: "Checkup Schedule",
    topic: "Third Trimester Checkups",
    content: "Third trimester: Bi-weekly (28-36 weeks), then weekly (36+ weeks). Monitor: blood pressure, fetal growth, position, Group B strep test (35-37 weeks). Check for signs of labor, preeclampsia. Discuss delivery options, pain management.",
    source: "WHO",
    trimester: "third",
    priority: "high",
  },
  
  // Expanded Ontology: Common Concerns
  {
    id: "concern-1",
    category: "Common Concerns",
    topic: "Sleep Problems",
    content: "Sleep disturbances common in pregnancy: difficulty finding comfortable position, frequent urination, leg cramps, heartburn, anxiety. Tips: sleep on left side, use pillows, avoid caffeine, establish routine, relaxation techniques.",
    source: "WHO",
    trimester: "all",
    priority: "medium",
  },
  {
    id: "concern-2",
    category: "Common Concerns",
    topic: "Constipation",
    content: "Constipation affects 40% of pregnant women due to hormones and iron supplements. Management: high-fiber diet (fruits, vegetables, whole grains), stay hydrated, exercise, consider stool softeners (consult doctor).",
    source: "WHO",
    trimester: "all",
    priority: "medium",
  },
  {
    id: "concern-3",
    category: "Common Concerns",
    topic: "Heartburn",
    content: "Heartburn/acid reflux common, especially in third trimester. Causes: hormones relax esophageal sphincter, growing uterus presses stomach. Management: small frequent meals, avoid spicy/fatty foods, don't lie down after eating, elevate head while sleeping.",
    source: "WHO",
    trimester: "third",
    priority: "medium",
  },
  
  // Expanded Ontology: Labor & Delivery
  {
    id: "labor-1",
    category: "Labor & Delivery",
    topic: "Signs of Labor",
    content: "True labor signs: regular contractions that intensify, water breaking (amniotic fluid), bloody show (mucus plug). False labor: irregular contractions, stop with movement. When to go to hospital: contractions 5 minutes apart, water breaks, or any concerns.",
    source: "WHO",
    trimester: "third",
    priority: "high",
  },
  {
    id: "labor-2",
    category: "Labor & Delivery",
    topic: "Preterm Labor",
    content: "Preterm labor: contractions before 37 weeks. Warning signs: regular contractions, pelvic pressure, backache, cramping, vaginal discharge changes. Seek immediate medical care. Risk factors: previous preterm birth, multiple pregnancy, infections.",
    source: "WHO",
    trimester: "third",
    priority: "critical",
  },
  
  // Expanded Ontology: Postpartum
  {
    id: "postpartum-1",
    category: "Postpartum",
    topic: "Postpartum Recovery",
    content: "Postpartum period: first 6 weeks after delivery. Physical recovery: bleeding (lochia) 4-6 weeks, perineal care, C-section wound care, breast care. Emotional: baby blues common, watch for postpartum depression. Rest, nutrition, support essential.",
    source: "WHO",
    trimester: "all",
    priority: "high",
  },
  
  // Expanded: Bangladesh-Specific
  {
    id: "bd-2",
    category: "Bangladesh Context",
    topic: "Rural Healthcare Access",
    content: "In rural Bangladesh, utilize: Upazila Health Complex, Union Health Centers, Community Clinics, and Community Health Workers (CHWs). CHWs provide: health education, basic care, referral services. Mobile health services available in some areas.",
    source: "DGHS",
    trimester: "all",
    priority: "high",
  },
  {
    id: "bd-3",
    category: "Bangladesh Context",
    topic: "Traditional Practices",
    content: "Some traditional practices may be harmful. Consult healthcare providers about: dietary restrictions, herbal remedies, home treatments. Safe practices: rest, family support, cultural foods (if nutritionally adequate). Avoid: unproven treatments, delaying medical care.",
    source: "DGHS",
    trimester: "all",
    priority: "medium",
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

