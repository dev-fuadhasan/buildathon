// Internationalization support for English and Bangla

export type Language = "en" | "bn";

export const translations = {
  en: {
    // Common
    common: {
      welcome: "Welcome",
      login: "Login",
      logout: "Logout",
      register: "Register",
      save: "Save",
      cancel: "Cancel",
      submit: "Submit",
      delete: "Delete",
      edit: "Edit",
      view: "View",
      back: "Back",
      next: "Next",
      previous: "Previous",
      loading: "Loading...",
      error: "Error",
      success: "Success",
      search: "Search",
      filter: "Filter",
      close: "Close",
    },
    // Homepage
    home: {
      title: "Pregnancy guidance with trusted doctors and AI",
      subtitle: "Chat with MomsCare AI, track your pregnancy, upload prescriptions, and get answers from approved doctors — all in one place.",
      chatButton: "Chat with MomsCare",
      motherButton: "I'm a mother",
      mothersTitle: "Mothers",
      mothersDesc: "Register, manage your pregnancy profile, upload prescriptions, and ask doctors private questions.",
      doctorsTitle: "Doctors",
      doctorsDesc: "Apply for approval, review mother questions, and provide timely, compassionate answers.",
      feature1: "AI chatbot tuned for pregnancy safety",
      feature2: "Doctor answers with profile-aware context",
      feature3: "Secure prescription uploads to Cloudflare R2",
    },
    // Mother Dashboard
    mother: {
      dashboard: "Mother Dashboard",
      profile: "Profile",
      prescriptions: "Prescriptions",
      questions: "Q&A with Doctors",
      progress: "Progress",
      welcome: "Welcome back",
      name: "Full Name",
      email: "Email",
      age: "Age",
      weeksPregnant: "Weeks Pregnant",
      dueDate: "Due Date",
      conditions: "Medical Conditions",
      medications: "Current Medications",
      phone: "Phone Number",
      address: "Address",
      bloodGroup: "Blood Group",
      emergencyContact: "Emergency Contact",
      emergencyPhone: "Emergency Contact Phone",
      uploadPrescription: "Upload Prescription",
      askDoctor: "Ask a Doctor",
      yourQuestions: "Your Questions & Answers",
      noPrescriptions: "No prescriptions uploaded yet",
      noQuestions: "No questions yet",
      waiting: "Waiting for doctor's response...",
      answered: "Doctor's Answer",
    },
    // Doctor Dashboard
    doctor: {
      dashboard: "Doctor Dashboard",
      totalQuestions: "Total Questions",
      pending: "Pending",
      answered: "Answered",
      viewPatientDetails: "View Patient Details",
      patientInfo: "Patient Information",
      yourAnswer: "Your Answer",
      submitAnswer: "Submit Answer",
      noQuestions: "No questions available yet",
    },
    // Admin Dashboard
    admin: {
      dashboard: "Admin Dashboard",
      overview: "Overview",
      mothers: "Mothers",
      doctors: "Doctors",
      questions: "Questions",
      pendingDoctors: "Pending Doctors",
      approvedDoctors: "Approved Doctors",
      allMothers: "All Mothers",
      allDoctors: "All Doctors",
      approve: "Approve",
      reject: "Reject",
      viewDetails: "View Details",
    },
    // Chat
    chat: {
      title: "MomsCare AI Chat",
      personalized: "You're logged in! I'll provide personalized answers based on your profile.",
      public: "Public chat - Log in as a mother for personalized guidance.",
      disclaimer: "MomsCare is not a substitute for professional medical advice. Always consult with your healthcare provider for medical concerns and emergencies.",
      placeholder: "Type your message...",
      send: "Send",
    },
  },
  bn: {
    // Common
    common: {
      welcome: "স্বাগতম",
      login: "লগইন",
      logout: "লগআউট",
      register: "নিবন্ধন",
      save: "সংরক্ষণ",
      cancel: "বাতিল",
      submit: "জমা দিন",
      delete: "মুছুন",
      edit: "সম্পাদনা",
      view: "দেখুন",
      back: "পিছনে",
      next: "পরবর্তী",
      previous: "পূর্ববর্তী",
      loading: "লোড হচ্ছে...",
      error: "ত্রুটি",
      success: "সফল",
      search: "খুঁজুন",
      filter: "ফিল্টার",
      close: "বন্ধ",
    },
    // Homepage
    home: {
      title: "বিশ্বস্ত ডাক্তার এবং AI সহ গর্ভাবস্থার নির্দেশনা",
      subtitle: "MomsCare AI এর সাথে চ্যাট করুন, আপনার গর্ভাবস্থা ট্র্যাক করুন, প্রেসক্রিপশন আপলোড করুন এবং অনুমোদিত ডাক্তারদের কাছ থেকে উত্তর পান — সব এক জায়গায়।",
      chatButton: "MomsCare এর সাথে চ্যাট করুন",
      motherButton: "আমি একজন মা",
      mothersTitle: "মায়েরা",
      mothersDesc: "নিবন্ধন করুন, আপনার গর্ভাবস্থার প্রোফাইল পরিচালনা করুন, প্রেসক্রিপশন আপলোড করুন এবং ডাক্তারদের ব্যক্তিগত প্রশ্ন জিজ্ঞাসা করুন।",
      doctorsTitle: "ডাক্তার",
      doctorsDesc: "অনুমোদনের জন্য আবেদন করুন, মায়েদের প্রশ্ন পর্যালোচনা করুন এবং সময়মতো, সহানুভূতিশীল উত্তর প্রদান করুন।",
      feature1: "গর্ভাবস্থার নিরাপত্তার জন্য টিউন করা AI চ্যাটবট",
      feature2: "প্রোফাইল-সচেতন প্রসঙ্গ সহ ডাক্তারের উত্তর",
      feature3: "Cloudflare R2 এ নিরাপদ প্রেসক্রিপশন আপলোড",
    },
    // Mother Dashboard
    mother: {
      dashboard: "মা ড্যাশবোর্ড",
      profile: "প্রোফাইল",
      prescriptions: "প্রেসক্রিপশন",
      questions: "ডাক্তারদের সাথে প্রশ্নোত্তর",
      progress: "অগ্রগতি",
      welcome: "ফিরে আসার জন্য স্বাগতম",
      name: "পূর্ণ নাম",
      email: "ইমেইল",
      age: "বয়স",
      weeksPregnant: "গর্ভাবস্থার সপ্তাহ",
      dueDate: "প্রসবের তারিখ",
      conditions: "চিকিৎসা অবস্থা",
      medications: "বর্তমান ওষুধ",
      phone: "ফোন নম্বর",
      address: "ঠিকানা",
      bloodGroup: "রক্তের গ্রুপ",
      emergencyContact: "জরুরি যোগাযোগ",
      emergencyPhone: "জরুরি যোগাযোগ ফোন",
      uploadPrescription: "প্রেসক্রিপশন আপলোড করুন",
      askDoctor: "ডাক্তারকে জিজ্ঞাসা করুন",
      yourQuestions: "আপনার প্রশ্ন ও উত্তর",
      noPrescriptions: "এখনও কোন প্রেসক্রিপশন আপলোড করা হয়নি",
      noQuestions: "এখনও কোন প্রশ্ন নেই",
      waiting: "ডাক্তারের উত্তর অপেক্ষা করছে...",
      answered: "ডাক্তারের উত্তর",
    },
    // Doctor Dashboard
    doctor: {
      dashboard: "ডাক্তার ড্যাশবোর্ড",
      totalQuestions: "মোট প্রশ্ন",
      pending: "অপেক্ষমান",
      answered: "উত্তর দেওয়া হয়েছে",
      viewPatientDetails: "রোগীর বিবরণ দেখুন",
      patientInfo: "রোগীর তথ্য",
      yourAnswer: "আপনার উত্তর",
      submitAnswer: "উত্তর জমা দিন",
      noQuestions: "এখনও কোন প্রশ্ন নেই",
    },
    // Admin Dashboard
    admin: {
      dashboard: "অ্যাডমিন ড্যাশবোর্ড",
      overview: "ওভারভিউ",
      mothers: "মায়েরা",
      doctors: "ডাক্তার",
      questions: "প্রশ্ন",
      pendingDoctors: "অপেক্ষমান ডাক্তার",
      approvedDoctors: "অনুমোদিত ডাক্তার",
      allMothers: "সব মা",
      allDoctors: "সব ডাক্তার",
      approve: "অনুমোদন",
      reject: "প্রত্যাখ্যান",
      viewDetails: "বিবরণ দেখুন",
    },
    // Chat
    chat: {
      title: "MomsCare AI চ্যাট",
      personalized: "আপনি লগইন করেছেন! আমি আপনার প্রোফাইলের উপর ভিত্তি করে ব্যক্তিগতকৃত উত্তর প্রদান করব।",
      public: "পাবলিক চ্যাট - ব্যক্তিগতকৃত নির্দেশনার জন্য মা হিসাবে লগইন করুন।",
      disclaimer: "MomsCare পেশাদার চিকিৎসা পরামর্শের বিকল্প নয়। চিকিৎসা উদ্বেগ এবং জরুরি অবস্থার জন্য সর্বদা আপনার স্বাস্থ্যসেবা প্রদানকারীর সাথে পরামর্শ করুন।",
      placeholder: "আপনার বার্তা টাইপ করুন...",
      send: "প্রেরণ",
    },
  },
};

export function getTranslations(lang: Language) {
  return translations[lang];
}

export function getLanguage(): Language {
  if (typeof window === "undefined") return "en";
  return (localStorage.getItem("language") || "en") as Language;
}

export function setLanguage(lang: Language) {
  if (typeof window !== "undefined") {
    localStorage.setItem("language", lang);
  }
}

