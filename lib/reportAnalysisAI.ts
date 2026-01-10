/**
 * AI Report Analysis
 * Generates professional medical-grade summaries from patient data
 */

import { MotherProfile, DailyEntry, DailyRoutine, ChatMessage } from "./data";
import { askMomsCare } from "./momsCareChat";

/**
 * Analyzes prescriptions and reports to generate a detailed medical summary
 */
export async function analyzePrescriptionsAndReports(
  mother: MotherProfile,
  prescriptionUrls: string[]
): Promise<string> {
  if (!prescriptionUrls || prescriptionUrls.length === 0) {
    return "No prescriptions or medical reports available for analysis.";
  }

  try {
    const daysPregnant = mother.daysPregnant || (mother.weeksPregnant ? mother.weeksPregnant * 7 : undefined);
    const weeksPregnant = daysPregnant ? Math.floor(daysPregnant / 7) : mother.weeksPregnant;

    const profileContext = `
Name: ${mother.name || "N/A"}
Age: ${mother.age || "N/A"}
Weeks Pregnant: ${weeksPregnant || "N/A"}
Medical Conditions: ${mother.conditions || "None"}
Current Medications: ${mother.medications || "None"}
Allergies: ${mother.allergies || "None"}
Blood Group: ${mother.bloodGroup || "N/A"}
`;

    const prompt = `You are a medical professional analyzing prescriptions and medical reports for a pregnant patient.

${profileContext}

The patient has ${prescriptionUrls.length} prescription/report file(s) uploaded.

Please analyze these medical documents and provide a comprehensive, professional medical summary that includes:
1. Current medications and dosages (if visible in prescriptions)
2. Medical test results and their significance (if any reports are available)
3. Treatment plans or recommendations from doctors
4. Any concerns or follow-up requirements
5. Medication compliance status
6. Overall medical status assessment

Write this as a professional medical summary that a doctor would understand. Be specific, medically accurate, and professional.

If you cannot see specific details in the documents, state that clearly. Focus on what you can analyze from the available information.`;

    const messages = [
      {
        role: "user",
        content: prompt,
      },
    ];

    const analysis = await askMomsCare(
      messages,
      profileContext,
      prescriptionUrls,
      weeksPregnant,
      true,
      true,
      {
        motherId: mother.id,
      }
    );

    return analysis.trim();
  } catch (error: any) {
    console.error("Error analyzing prescriptions:", error);
    return `Prescription analysis unavailable. ${prescriptionUrls.length} file(s) are available but could not be analyzed at this time.`;
  }
}

/**
 * Analyzes Q&A with doctors to generate a summary
 */
export async function analyzeQuestionsAndAnswers(
  mother: MotherProfile,
  questions: Array<{ question: string; answer?: string; createdAt: string }>
): Promise<string> {
  if (!questions || questions.length === 0) {
    return "No questions have been asked to doctors yet.";
  }

  try {
    const daysPregnant = mother.daysPregnant || (mother.weeksPregnant ? mother.weeksPregnant * 7 : undefined);
    const weeksPregnant = daysPregnant ? Math.floor(daysPregnant / 7) : mother.weeksPregnant;

    const profileContext = `
Name: ${mother.name || "N/A"}
Age: ${mother.age || "N/A"}
Weeks Pregnant: ${weeksPregnant || "N/A"}
Medical Conditions: ${mother.conditions || "None"}
Allergies: ${mother.allergies || "None"}
`;

    const qaContext = questions
      .slice(0, 20) // Limit to recent 20 Q&As
      .map((qa, idx) => {
        if (qa.answer) {
          return `Q${idx + 1}: ${qa.question}\nA${idx + 1}: ${qa.answer}`;
        }
        return `Q${idx + 1}: ${qa.question} (Not yet answered)`;
      })
      .join("\n\n");

    const prompt = `You are a medical professional reviewing patient-doctor interactions.

${profileContext}

The patient has asked ${questions.length} question(s) to doctors. Here are the questions and answers:

${qaContext}

Please analyze these Q&As and provide a professional medical summary that includes:
1. Main health concerns raised by the patient
2. Key medical advice provided by doctors
3. Recurring themes or patterns in questions
4. Overall health status based on questions asked
5. Any follow-up recommendations or concerns

Write this as a professional medical summary suitable for a medical report.`;

    const messages = [
      {
        role: "user",
        content: prompt,
      },
    ];

    const analysis = await askMomsCare(
      messages,
      profileContext,
      undefined,
      weeksPregnant,
      true,
      true,
      {
        motherId: mother.id,
      }
    );

    return analysis.trim();
  } catch (error: any) {
    console.error("Error analyzing Q&As:", error);
    return `Q&A analysis unavailable. ${questions.length} question(s) were asked but could not be analyzed at this time.`;
  }
}

/**
 * Analyzes daily entries to generate a health summary
 */
export async function analyzeDailyEntries(
  mother: MotherProfile,
  dailyEntries: DailyEntry[]
): Promise<string> {
  if (!dailyEntries || dailyEntries.length === 0) {
    return "No daily journal entries available for analysis.";
  }

  try {
    const daysPregnant = mother.daysPregnant || (mother.weeksPregnant ? mother.weeksPregnant * 7 : undefined);
    const weeksPregnant = daysPregnant ? Math.floor(daysPregnant / 7) : mother.weeksPregnant;

    const profileContext = `
Name: ${mother.name || "N/A"}
Age: ${mother.age || "N/A"}
Weeks Pregnant: ${weeksPregnant || "N/A"}
Medical Conditions: ${mother.conditions || "None"}
Allergies: ${mother.allergies || "None"}
`;

    const entriesContext = dailyEntries
      .slice(0, 30) // Limit to recent 30 entries
      .map((entry, idx) => `Entry ${idx + 1} (${entry.date}): ${entry.entry}`)
      .join("\n\n");

    const prompt = `You are a medical professional analyzing a patient's daily journal entries.

${profileContext}

The patient has made ${dailyEntries.length} daily journal entry/entries. Here are the entries:

${entriesContext}

Please analyze these entries and provide a professional medical summary that includes:
1. Overall health trends and patterns
2. Symptoms or concerns mentioned
3. Mood and emotional well-being patterns
4. Lifestyle factors (sleep, activity, stress)
5. Any concerning patterns that need medical attention
6. Positive health indicators

Write this as a professional medical summary suitable for a medical report. Focus on medically relevant information.`;

    const messages = [
      {
        role: "user",
        content: prompt,
      },
    ];

    const analysis = await askMomsCare(
      messages,
      profileContext,
      undefined,
      weeksPregnant,
      true,
      true,
      {
        motherId: mother.id,
      }
    );

    return analysis.trim();
  } catch (error: any) {
    console.error("Error analyzing daily entries:", error);
    return `Daily entries analysis unavailable. ${dailyEntries.length} entry/entries were made but could not be analyzed at this time.`;
  }
}

/**
 * Analyzes chat history to generate a summary
 */
export async function analyzeChatHistory(
  mother: MotherProfile,
  chatHistory: ChatMessage[]
): Promise<string> {
  if (!chatHistory || chatHistory.length === 0) {
    return "No chat history available for analysis.";
  }

  try {
    const daysPregnant = mother.daysPregnant || (mother.weeksPregnant ? mother.weeksPregnant * 7 : undefined);
    const weeksPregnant = daysPregnant ? Math.floor(daysPregnant / 7) : mother.weeksPregnant;

    const profileContext = `
Name: ${mother.name || "N/A"}
Age: ${mother.age || "N/A"}
Weeks Pregnant: ${weeksPregnant || "N/A"}
Medical Conditions: ${mother.conditions || "None"}
Allergies: ${mother.allergies || "None"}
`;

    const chatContext = chatHistory
      .slice(-30) // Last 30 messages
      .map((msg) => `${msg.role === "user" ? "Patient" : "Assistant"}: ${msg.content}`)
      .join("\n\n");

    const prompt = `You are a medical professional analyzing a patient's chat conversation history with an AI health assistant.

${profileContext}

The patient has had ${chatHistory.length} message(s) in chat conversations. Here is a sample of the conversation:

${chatContext}

Please analyze this conversation and provide a professional medical summary that includes:
1. Health concerns discussed
2. Information seeking patterns
3. Health awareness and engagement level
4. Any medical questions or topics of interest
5. Overall health communication patterns

Write this as a professional medical summary suitable for a medical report.`;

    const messages = [
      {
        role: "user",
        content: prompt,
      },
    ];

    const analysis = await askMomsCare(
      messages,
      profileContext,
      undefined,
      weeksPregnant,
      true,
      true,
      {
        motherId: mother.id,
      }
    );

    return analysis.trim();
  } catch (error: any) {
    console.error("Error analyzing chat history:", error);
    return `Chat history analysis unavailable. ${chatHistory.length} message(s) were exchanged but could not be analyzed at this time.`;
  }
}

/**
 * Analyzes daily routines to generate a nutrition and activity summary
 */
export async function analyzeDailyRoutines(
  mother: MotherProfile,
  routines: DailyRoutine[]
): Promise<string> {
  if (!routines || routines.length === 0) {
    return "No daily routine data available for analysis.";
  }

  try {
    const daysPregnant = mother.daysPregnant || (mother.weeksPregnant ? mother.weeksPregnant * 7 : undefined);
    const weeksPregnant = daysPregnant ? Math.floor(daysPregnant / 7) : mother.weeksPregnant;

    const profileContext = `
Name: ${mother.name || "N/A"}
Age: ${mother.age || "N/A"}
Weeks Pregnant: ${weeksPregnant || "N/A"}
Medical Conditions: ${mother.conditions || "None"}
Allergies: ${mother.allergies || "None"}
`;

    const routinesContext = routines
      .slice(0, 20) // Recent 20 routines
      .map((routine) => {
        const eatenCount = [routine.breakfastEaten, routine.lunchEaten, routine.dinnerEaten].filter(Boolean).length;
        return `Date: ${routine.date}
Food: Breakfast: ${routine.breakfast} (${routine.breakfastEaten ? "Eaten" : "Not eaten"}), Lunch: ${routine.lunch} (${routine.lunchEaten ? "Eaten" : "Not eaten"}), Dinner: ${routine.dinner} (${routine.dinnerEaten ? "Eaten" : "Not eaten"})
Exercises: ${routine.exercises} (${routine.exercisesDone ? "Done" : "Not done"})
Completion: ${eatenCount}/3 meals, Exercises: ${routine.exercisesDone ? "Yes" : "No"}`;
      })
      .join("\n\n");

    const prompt = `You are a medical professional analyzing a patient's daily nutrition and exercise routine.

${profileContext}

The patient has ${routines.length} daily routine record(s). Here is the routine data:

${routinesContext}

Please analyze this data and provide a professional medical summary that includes:
1. Nutrition compliance and patterns
2. Exercise compliance and patterns
3. Overall lifestyle adherence
4. Nutritional adequacy assessment
5. Physical activity levels
6. Recommendations for improvement

Write this as a professional medical summary suitable for a medical report.`;

    const messages = [
      {
        role: "user",
        content: prompt,
      },
    ];

    const analysis = await askMomsCare(
      messages,
      profileContext,
      undefined,
      weeksPregnant,
      true,
      true,
      {
        motherId: mother.id,
      }
    );

    return analysis.trim();
  } catch (error: any) {
    console.error("Error analyzing daily routines:", error);
    return `Daily routine analysis unavailable. ${routines.length} routine record(s) were tracked but could not be analyzed at this time.`;
  }
}

