# MomsCare AI - Unified Logic Documentation

## 🎯 Overview

This document describes the comprehensive, context-aware AI behavior system implemented in MomsCare. The system adapts its behavior based on user login status, question type, and available profile data.

---

## 📋 Table of Contents

1. [Architecture](#architecture)
2. [Global Rules](#global-rules)
3. [User States](#user-states)
4. [Question Classification](#question-classification)
5. [Follow-up Logic](#follow-up-logic)
6. [Safety Protocols](#safety-protocols)
7. [Response Style](#response-style)
8. [Implementation Details](#implementation-details)
9. [Examples](#examples)

---

## 🏗️ Architecture

### **Core Function**

```typescript
getUnifiedSystemPrompt(isLoggedIn: boolean, hasProfile: boolean): string
```

This function generates a dynamic system prompt that adapts based on:
- User login status
- Availability of profile data
- Question context

### **Integration Point**

```typescript
// In lib/momsCareChat.ts
const hasProfile = !!(profileContext && profileContext.trim().length > 0);
const userIsLoggedIn = isLoggedIn ?? hasProfile;
const systemPrompt = getUnifiedSystemPrompt(userIsLoggedIn, hasProfile);
```

---

## 🌐 Global Rules (Apply Everywhere)

### **1. Follow-up Question Analysis**

Before answering ANY question:
1. ✅ Check if the question requires clarification
2. ✅ If yes → Ask ONE follow-up question first
3. ✅ Wait for user response
4. ✅ Then provide final answer

**Triggers for follow-up:**
- Pain without location (`"betha ache"` → `"kothai betha?"`)
- Discharge without color/amount
- Swelling without timeline
- Symptoms without trimester info (if not in profile)

### **2. Question Type Detection**

Every question is classified as:

| Type | Indicators | Example |
|------|-----------|---------|
| **Personal** | "amar", "I have", "my pain", "amar baby" | `"Amar pet betha korche"` |
| **General** | "ki", "what", "how", no personal pronouns | `"Gorbhobosthay ki khabo?"` |
| **About Others** | "tar", "her", "someone's" | `"Tar pet betha korche"` |

### **3. Response Quality**

✅ **DO:**
- Keep answers short and clear
- Use simple, mother-friendly language
- Provide when-to-seek-doctor guidance
- Be supportive and calming

❌ **DON'T:**
- Give long medical lectures
- Use unnecessary technical terms
- Induce fear or panic
- Mention profile details unless asked

---

## 👤 User States

### **State 1: Logged-Out User**

```
User Status: Not logged in
Profile Data: None
Behavior: General advice mode
```

#### **Characteristics:**
- ❌ No access to profile, prescriptions, history
- ✅ Treats ALL questions as general
- ✅ Provides standard pregnancy advice
- ✅ Does not mention lack of profile data

#### **Example:**
```
User: "Gorbhobosthay kototi appointment korte hobe?"
AI: "গর্ভাবস্থায় সাধারণত মাসিক ১টি করে চেকআপ করা উচিত, 
     মোট প্রায় ৮টি ভিজিট..."
```

---

### **State 2: Logged-In Mother (General Question)**

```
User Status: Logged in
Profile Data: Available
Question Type: General (not about herself)
Behavior: General advice mode (ignores profile)
```

#### **Characteristics:**
- ✅ Has profile data but DOES NOT use it
- ✅ Answers as general pregnancy question
- ✅ May state answer is general if appropriate
- ❌ Does not personalize response

#### **Example:**
```
User (logged in): "Gorbhobosthay ki khabar khawa uchit?"
AI: "গর্ভাবস্থায় পুষ্টিকর খাবার যেমন ফল, শাকসবজি, ডাল, 
     মাছ, দুধ খাওয়া উচিত..."
(Does NOT mention her specific week or prescriptions)
```

---

### **State 3: Logged-In Mother (Personal Question)**

```
User Status: Logged in
Profile Data: Available
Question Type: Personal (about herself)
Behavior: Personalized mode (uses profile)
```

#### **Characteristics:**
- ✅ Quietly analyzes profile, prescriptions, risks
- ✅ Uses data to personalize answer
- ✅ Considers her specific symptoms, week, history
- ❌ Does NOT list profile details unless asked
- ✅ Provides relevant, contextualized advice

#### **Example:**
```
User Profile:
- 28 weeks pregnant
- High risk: Gestational diabetes
- Prescription: Metformin 500mg

User: "Amar pet betha korche, ki korbo?"
AI: [Quietly checks: 28 weeks, diabetes, symptoms]
    "২৮ সপ্তাহে পেট ব্যথা থাকলে:
     1. কোন জায়গায় ব্যথা?
     2. ব্যথা কতক্ষণ ধরে?
     
     আপনার ডায়াবেটিস আছে, তাই ডাক্তারকে জানান।"
```

---

## 🔍 Question Classification

### **How to Identify Personal Questions**

#### **Keywords That Indicate Personal:**
- **Bangla:** `amar`, `amake`, `amar baby`, `amar shontan`
- **English:** `I have`, `my pain`, `my symptoms`, `I am feeling`
- **Context:** User is logged in + mentions symptoms

#### **Keywords That Indicate General:**
- **Bangla:** `ki`, `kemon`, `kivabe`, `general`
- **English:** `what`, `how`, `when`, `should`, `can`
- **Context:** No personal pronouns, asking for information

#### **Decision Tree:**

```
Is user logged in?
  ├─ NO → General question (no profile)
  └─ YES → Check question content
      ├─ Contains "amar", "I have", "my" → Personal question
      └─ Contains "ki", "what", "how" → General question
```

---

## ❓ Follow-up Logic

### **When to Ask Follow-ups**

✅ **Always ask follow-up if:**
1. Symptom mentioned without details
2. Multiple possible interpretations
3. Treatment depends on specific info
4. Safety concern that needs clarification

❌ **Never ask follow-up if:**
1. Question is clear and complete
2. Emergency situation (act immediately)
3. Simple informational query
4. Already answered in previous message

### **Follow-up Examples**

#### **Example 1: Pain Location**
```
User: "Betha korche"
AI: "কোথায় ব্যথা করছে? (পেট/মাথা/পিঠ?)"

User: "Pet"
AI: [Now provides answer about abdominal pain]
```

#### **Example 2: Discharge**
```
User: "Discharge ache"
AI: "কি রঙের discharge? কতদিন ধরে?"

User: "Sada, 2 din"
AI: [Now provides answer about white discharge]
```

#### **Example 3: Swelling**
```
User: "Haat phule geche"
AI: "ফোলা কতদিন ধরে? ব্যথা আছে কি?"

User: "3 din, ektu betha"
AI: [Now provides answer with context]
```

### **Follow-up Limits**

- ✅ Maximum **2 follow-up questions**
- ✅ Ask most important question first
- ✅ If still unclear after 2 follow-ups, provide general answer + doctor recommendation

---

## 🚨 Safety Protocols

### **Critical Emergency Symptoms**

The AI **MUST** immediately recommend emergency care for:

| Symptom | AI Response |
|---------|-------------|
| Heavy bleeding | 🚨 CRITICAL: Go to hospital NOW |
| Severe pain | 🚨 CRITICAL: Emergency medical attention |
| No fetal movement (20+ weeks) | 🚨 CRITICAL: Contact doctor immediately |
| Water breaking unexpectedly | 🚨 CRITICAL: Go to hospital |
| High fever | 🚨 CRITICAL: Seek medical care |
| Seizures/convulsions | 🚨 CRITICAL: Call emergency services |
| Severe headache + vision issues | 🚨 CRITICAL: Possible preeclampsia |
| Difficulty breathing | 🚨 CRITICAL: Emergency care needed |
| Trauma/injury | 🚨 CRITICAL: Go to hospital |

### **High-Risk Symptoms**

⚠️ **Contact healthcare provider soon:**
- Moderate bleeding/spotting
- Persistent pain
- Reduced fetal movement
- Unusual discharge
- Swelling with pain
- Dizziness/fainting

### **Low-Risk Symptoms**

💡 **Discuss at next visit:**
- Mild discomfort
- Mild fatigue
- Constipation
- Heartburn
- Mood swings

---

## 💬 Response Style

### **Tone Guidelines**

✅ **DO:**
```
"গর্ভাবস্থায় এটা স্বাভাবিক। আপনি ঠিক আছেন।"
(Reassuring, calm, supportive)
```

❌ **DON'T:**
```
"এটা খুবই বিপজ্জনক! হরমোনাল পরিবর্তনের কারণে..."
(Fear-inducing, overly technical)
```

### **Length Guidelines**

✅ **Good (Short & Clear):**
```
"২৮ সপ্তাহে মাসিক ১টি চেকআপ করুন। 
মোট ৮টি ভিজিট লাগবে।"
```

❌ **Bad (Too Long):**
```
"গর্ভাবস্থায় অ্যান্টেনাটাল কেয়ার অত্যন্ত গুরুত্বপূর্ণ। 
WHO-এর গাইডলাইন অনুযায়ী প্রথম ট্রাইমেস্টারে...
[5 more paragraphs]"
```

### **Medical Terms**

✅ **Use simple words:**
- "পেট ব্যথা" instead of "এবডোমিনাল পেইন"
- "বাচ্চা" instead of "ফিটাস"
- "রক্তচাপ" instead of "ব্লাড প্রেশার"

---

## 🔧 Implementation Details

### **File Structure**

```
lib/
├── safetyGuardrails.ts       # Contains getUnifiedSystemPrompt()
└── momsCareChat.ts           # Uses unified prompt
```

### **Key Functions**

#### **1. getUnifiedSystemPrompt()**

```typescript
export function getUnifiedSystemPrompt(
  isLoggedIn: boolean, 
  hasProfile: boolean
): string {
  // Returns dynamic system prompt based on user state
}
```

#### **2. askMomsCare()**

```typescript
export async function askMomsCare(
  messages: Array<{ role: string; content: string }>,
  profileContext?: string,
  prescriptionUrls?: string[],
  weeksPregnant?: number,
  isPersonal?: boolean,
  isLoggedIn?: boolean,
): Promise<string>
```

### **System Prompt Construction**

```typescript
// 1. Determine user state
const hasProfile = !!(profileContext && profileContext.trim().length > 0);
const userIsLoggedIn = isLoggedIn ?? hasProfile;

// 2. Get base unified prompt
const unifiedPromptBase = getUnifiedSystemPrompt(userIsLoggedIn, hasProfile);

// 3. Add language instruction
systemPrompt = unifiedPromptBase + languageInstruction;

// 4. Add scope restriction
systemPrompt += scopeRestriction;

// 5. Add current question context
if (userIsLoggedIn) {
  if (isGeneralQuestion) {
    systemPrompt += "Logged-in user, general question.";
  } else if (isPersonalizedMode) {
    systemPrompt += "Logged-in user, personal question.";
  }
}
```

---

## 📝 Examples

### **Example 1: Logged-Out User (General Question)**

```
User State: Not logged in
Question: "Gorbhobosthay kototi appointment korbo?"

AI Behavior:
- ❌ No profile data available
- ✅ Treats as general question
- ✅ Provides standard guidance

AI Response:
"গর্ভাবস্থায় সাধারণত মাসিক ১টি করে চেকআপ করা উচিত। 
মোট প্রায় ৮টি ভিজিট লাগে। প্রথম ট্রাইমেস্টারে ১-২ বার..."
```

---

### **Example 2: Logged-In User (General Question)**

```
User State: Logged in (28 weeks, gestational diabetes)
Question: "Gorbhobosthay ki vitamin khawa uchit?"

AI Behavior:
- ✅ Has profile but question is general (not "amar")
- ❌ Does NOT use profile data
- ✅ Answers generally

AI Response:
"গর্ভাবস্থায় ফলিক এসিড, আয়রন, ক্যালসিয়াম, ভিটামিন ডি 
খাওয়া উচিত। ডাক্তারের পরামর্শ অনুযায়ী প্রেসক্রিপশন মেনে চলুন।"

(Does NOT mention her diabetes or specific prescriptions)
```

---

### **Example 3: Logged-In User (Personal Question)**

```
User State: Logged in (28 weeks, gestational diabetes)
Profile: Prescribed Metformin 500mg, high-risk pregnancy
Question: "Amar pet betha korche, ki korbo?"

AI Behavior:
- ✅ Question is personal ("amar")
- ✅ Quietly checks profile, prescriptions, risks
- ✅ Uses context to personalize answer
- ✅ Considers her specific condition

AI Response (Step 1 - Follow-up):
"কোন জায়গায় পেট ব্যথা? (উপরে/নিচে/মাঝে?) ব্যথা কতক্ষণ ধরে?"

User: "Niche, 1 ghonta"

AI Response (Step 2 - Final Answer):
"২৮ সপ্তাহে নিচের পেটে ব্যথা থাকলে:
1. বাম পাশে শুয়ে বিশ্রাম নিন
2. পানি খান
3. ১-২ ঘণ্টার মধ্যে ব্যথা কমতে হবে

⚠️ আপনার ডায়াবেটিস আছে, তাই:
- ব্যথা বাড়লে ডাক্তারকে জানান
- শরীর দুর্বল লাগলে হাসপাতালে যান"

(Uses profile data to give personalized, risk-aware advice)
```

---

### **Example 4: Follow-up Question Logic**

```
Scenario: Ambiguous symptom

User: "Discharge ache"

AI (Step 1 - Follow-up):
"কি রঙের discharge? কতদিন ধরে? গন্ধ আছে কি?"

User: "Halka sada, 3 din, gondho nai"

AI (Step 2 - Final Answer):
"হালকা সাদা discharge গর্ভাবস্থায় স্বাভাবিক। 
এটা leucorrhea, কোনো সমস্যা নেই।

⚠️ এগুলো থাকলে ডাক্তার দেখান:
- হলুদ/সবুজ রং
- গন্ধ
- চুলকানি"
```

---

### **Example 5: Emergency Detection**

```
User: "Heavy bleeding hochchhe, pet e severe pain"

AI Behavior:
- 🚨 Detects critical emergency keywords
- 🚨 Immediately recommends emergency care
- ❌ Does NOT give medical advice
- ❌ Does NOT try to diagnose

AI Response:
"🚨 CRITICAL: এটি জরুরি অবস্থা!

অনুগ্রহ করে এখনই:
1. নিকটতম হাসপাতালে যান
2. জরুরি বিভাগে যোগাযোগ করুন
3. বিলম্ব করবেন না

Heavy bleeding + severe pain গর্ভাবস্থায় 
অত্যন্ত বিপজ্জনক হতে পারে।"
```

---

## ✅ Summary

### **Key Principles**

1. **Context-Aware:** Adapts to user login status and question type
2. **Profile-Aware:** Uses profile data only when appropriate
3. **Follow-up Smart:** Asks clarifying questions when needed
4. **Safety-First:** Prioritizes emergency detection and appropriate warnings
5. **Language-Native:** Responds in user's language (English/Bangla/Banglish)
6. **User-Friendly:** Short, clear, supportive responses
7. **Medically Safe:** Evidence-based advice with doctor consultation guidance

### **User Experience Goals**

✅ Logged-out users get helpful general advice  
✅ Logged-in users get personalized, context-aware guidance  
✅ Emergency situations get immediate, appropriate warnings  
✅ Ambiguous questions get clarified before answering  
✅ All users feel supported and safe  

---

## 🚀 Deployment Status

**Status:** ✅ Production Ready  
**Commit:** `9a75277` - "feat: implement unified AI logic with comprehensive context-aware behavior"  
**Files Modified:**
- `lib/safetyGuardrails.ts` - Added `getUnifiedSystemPrompt()`
- `lib/momsCareChat.ts` - Integrated unified prompt logic

**Last Updated:** 2025-12-08  
**Version:** 2.0 (Unified Logic)

---

**For Questions or Support:** Refer to codebase or contact development team.

