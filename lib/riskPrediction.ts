/**
 * Early-Warning Risk Prediction System
 * Analyzes mother's profile and symptoms to predict potential risks
 */

import { MotherProfile } from "./data";

export type RiskFactor = {
  category: string;
  factor: string;
  severity: "critical" | "low" | "medium" | "high";
  recommendation: string;
};

export type RiskAssessment = {
  overallRisk: "low" | "medium" | "high";
  riskScore: number; // 0-100
  riskFactors: RiskFactor[];
  recommendations: string[];
  requiresMonitoring: boolean;
};

/**
 * Calculates risk score based on mother's profile
 */
export function assessRisk(profile: MotherProfile, currentSymptoms?: string): RiskAssessment {
  const riskFactors: RiskFactor[] = [];
  let riskScore = 0;
  
  // Age-based risks
  if (profile.age) {
    if (profile.age < 18) {
      riskFactors.push({
        category: "Age",
        factor: "Teenage pregnancy (<18 years)",
        severity: "high",
        recommendation: "Requires specialized care and monitoring. Higher risk of complications.",
      });
      riskScore += 15;
    } else if (profile.age >= 35) {
      riskFactors.push({
        category: "Age",
        factor: "Advanced maternal age (≥35 years)",
        severity: "medium",
        recommendation: "Increased monitoring recommended. Higher risk of gestational diabetes and hypertension.",
      });
      riskScore += 10;
    } else if (profile.age >= 40) {
      riskFactors.push({
        category: "Age",
        factor: "Advanced maternal age (≥40 years)",
        severity: "high",
        recommendation: "Requires close monitoring. Higher risk of complications and chromosomal abnormalities.",
      });
      riskScore += 20;
    }
  }
  
  // Weeks pregnant analysis
  if (profile.weeksPregnant) {
    if (profile.weeksPregnant < 12) {
      riskFactors.push({
        category: "Pregnancy Stage",
        factor: "Early pregnancy (first trimester)",
        severity: "low",
        recommendation: "Focus on folic acid, avoid harmful substances, and early prenatal care.",
      });
    } else if (profile.weeksPregnant >= 37) {
      riskFactors.push({
        category: "Pregnancy Stage",
        factor: "Full-term pregnancy (≥37 weeks)",
        severity: "low",
        recommendation: "Monitor for labor signs. Prepare for delivery.",
      });
    }
  }
  
  // Medical conditions
  if (profile.conditions) {
    const conditions = profile.conditions.toLowerCase();
    
    if (conditions.includes("diabetes") || conditions.includes("gestational diabetes")) {
      riskFactors.push({
        category: "Medical Condition",
        factor: "Diabetes",
        severity: "high",
        recommendation: "Requires strict blood sugar control and regular monitoring. Increased risk of complications.",
      });
      riskScore += 20;
    }
    
    if (conditions.includes("hypertension") || conditions.includes("high blood pressure")) {
      riskFactors.push({
        category: "Medical Condition",
        factor: "Hypertension",
        severity: "high",
        recommendation: "Requires close blood pressure monitoring. Risk of preeclampsia.",
      });
      riskScore += 20;
    }
    
    if (conditions.includes("anemia")) {
      riskFactors.push({
        category: "Medical Condition",
        factor: "Anemia",
        severity: "medium",
        recommendation: "Iron supplementation and monitoring required. May affect delivery.",
      });
      riskScore += 10;
    }
    
    if (conditions.includes("preeclampsia") || conditions.includes("eclampsia")) {
      riskFactors.push({
        category: "Medical Condition",
        factor: "Preeclampsia/Eclampsia",
        severity: "critical",
        recommendation: "CRITICAL: Requires immediate medical attention and close monitoring.",
      });
      riskScore += 30;
    }
  }
  
  // Previous pregnancies
  if (profile.previousPregnancies !== undefined) {
    if (profile.previousPregnancies === 0) {
      riskFactors.push({
        category: "Pregnancy History",
        factor: "First pregnancy",
        severity: "low",
        recommendation: "First-time mothers may have more questions. Regular prenatal care is essential.",
      });
    } else if (profile.previousPregnancies >= 5) {
      riskFactors.push({
        category: "Pregnancy History",
        factor: "Grand multiparity (≥5 previous pregnancies)",
        severity: "medium",
        recommendation: "Increased risk of complications. Requires careful monitoring.",
      });
      riskScore += 10;
    }
  }
  
  // Allergies
  if (profile.allergies) {
    riskFactors.push({
      category: "Allergies",
      factor: "Known allergies",
      severity: "medium",
      recommendation: "Ensure healthcare providers are aware. Avoid allergens and have emergency plan.",
    });
    riskScore += 5;
  }
  
  // Current symptoms analysis
  if (currentSymptoms) {
    const symptoms = currentSymptoms.toLowerCase();
    
    if (symptoms.includes("bleeding") || symptoms.includes("blood")) {
      riskFactors.push({
        category: "Current Symptoms",
        factor: "Vaginal bleeding",
        severity: "critical",
        recommendation: "URGENT: Seek immediate medical attention. This is a medical emergency.",
      });
      riskScore += 30;
    }
    
    if (symptoms.includes("severe pain") || symptoms.includes("excruciating")) {
      riskFactors.push({
        category: "Current Symptoms",
        factor: "Severe pain",
        severity: "critical",
        recommendation: "URGENT: Seek immediate medical attention.",
      });
      riskScore += 25;
    }
    
    if (symptoms.includes("no movement") || symptoms.includes("reduced movement")) {
      riskFactors.push({
        category: "Current Symptoms",
        factor: "Reduced fetal movement",
        severity: "high",
        recommendation: "Seek medical evaluation immediately. May indicate fetal distress.",
      });
      riskScore += 20;
    }
    
    if (symptoms.includes("high fever") || symptoms.includes("temperature")) {
      riskFactors.push({
        category: "Current Symptoms",
        factor: "Fever",
        severity: "high",
        recommendation: "Seek medical attention. Fever during pregnancy requires evaluation.",
      });
      riskScore += 15;
    }
  }
  
  // Determine overall risk level
  let overallRisk: "low" | "medium" | "high";
  if (riskScore >= 40) {
    overallRisk = "high";
  } else if (riskScore >= 20) {
    overallRisk = "medium";
  } else {
    overallRisk = "low";
  }
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (overallRisk === "high") {
    recommendations.push("⚠️ HIGH RISK: Requires close monitoring and frequent prenatal visits.");
    recommendations.push("Consider consultation with a maternal-fetal medicine specialist.");
  } else if (overallRisk === "medium") {
    recommendations.push("Moderate risk factors present. Regular monitoring recommended.");
  } else {
    recommendations.push("Low risk profile. Continue regular prenatal care.");
  }
  
  // Add specific recommendations based on risk factors
  riskFactors
    .filter((f) => f.severity === "high" || f.severity === "critical")
    .forEach((f) => {
      if (!recommendations.includes(f.recommendation)) {
        recommendations.push(f.recommendation);
      }
    });
  
  return {
    overallRisk,
    riskScore: Math.min(riskScore, 100), // Cap at 100
    riskFactors,
    recommendations,
    requiresMonitoring: overallRisk !== "low",
  };
}

/**
 * Formats risk assessment for display
 */
export function formatRiskAssessment(assessment: RiskAssessment): string {
  let output = `Risk Assessment: ${assessment.overallRisk.toUpperCase()} (Score: ${assessment.riskScore}/100)\n\n`;
  
  if (assessment.riskFactors.length > 0) {
    output += "Risk Factors:\n";
    assessment.riskFactors.forEach((factor) => {
      output += `- [${factor.severity.toUpperCase()}] ${factor.category}: ${factor.factor}\n`;
    });
    output += "\n";
  }
  
  if (assessment.recommendations.length > 0) {
    output += "Recommendations:\n";
    assessment.recommendations.forEach((rec) => {
      output += `- ${rec}\n`;
    });
  }
  
  return output;
}

