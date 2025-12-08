/**
 * Simple, Fast Response Handler
 * For common queries that don't need full AI processing
 */

export interface SimpleResponse {
  handled: boolean;
  response?: string;
}

/**
 * Handle simple queries with instant responses (no API calls)
 */
export function handleSimpleQuery(
  question: string,
  isLoggedIn: boolean,
  userLanguage: 'en' | 'bn'
): SimpleResponse {
  const lower = question.toLowerCase().trim();
  
  // Greeting
  if (/^(hello|hi|hey|assalamualaikum|salam|ki khobor)$/i.test(lower)) {
    return {
      handled: true,
      response: userLanguage === 'bn'
        ? "আসসালামু আলাইকুম! আমি MomsCare AI। আমি আপনাকে গর্ভাবস্থা এবং স্বাস্থ্য সম্পর্কিত পরামর্শ দিতে পারি। আপনার কি কোনো প্রশ্ন আছে?"
        : "Hello! I'm MomsCare AI. I can help you with pregnancy and health advice. How can I assist you?"
    };
  }
  
  // Asking for a question (logged in)
  if (isLoggedIn && /amake.*proshno|ask me.*question|proshno koro|question koro/i.test(lower)) {
    return {
      handled: true,
      response: userLanguage === 'bn'
        ? "আপনার গর্ভাবস্থার কোন বিষয়ে আমি আপনাকে সাহায্য করতে পারি?"
        : "What aspect of your pregnancy can I help you with?"
    };
  }
  
  // Medicine questions needing follow-up (logged in only)
  if (isLoggedIn && /amar ki.*(alargy|allergy|medicine|oshudh).*dorkar/.test(lower)) {
    // Check if they specified the type
    if (!/(dust|food|skin|khaber|chul|dhoroner|type)/.test(lower)) {
      return {
        handled: true,
        response: userLanguage === 'bn'
          ? "কি ধরনের অ্যালার্জি? (খাবার/ত্বক/ধুলো?)"
          : "What type of allergy? (Food/Skin/Dust?)"
      };
    }
  }
  
  // Logged-out users asking personal medical questions → redirect to login
  // Only intercept clear medical questions needing personal data
  if (!isLoggedIn && /^(amar|ami) (ki|kemon|koto)/.test(lower) && /(alargy|allergy|medicine|oshudh|betha|pain|problem)/.test(lower)) {
    return {
      handled: true,
      response: userLanguage === 'bn'
        ? "আপনার ব্যক্তিগত প্রশ্নের উত্তরের জন্য, অনুগ্রহ করে লগইন করুন। আমি সাধারণ গর্ভাবস্থা সম্পর্কিত প্রশ্নের উত্তর দিতে পারি।"
        : "For personalized answers, please log in. I can help with general pregnancy questions."
    };
  }
  
  return { handled: false };
}

/**
 * Fix missing question marks - SIMPLE and SAFE
 * Only adds ? to obvious questions that are missing it
 */
export function ensureQuestionMarks(text: string): string {
  // SIMPLE APPROACH: Only fix obvious missing question marks
  // Don't mess with existing punctuation
  
  if (!text || text.trim().length === 0) {
    return text;
  }
  
  // Split by line breaks to handle each line separately
  const lines = text.split('\n');
  const fixed = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;
    
    // Already has question mark or ends with punctuation? Leave it alone
    if (/[?।.]$/.test(trimmed)) {
      return line;
    }
    
    // Check if it's clearly a question (starts with question word)
    const isBanglaQuestion = /^(কি |কে |কেন |কখন |কোথায় |কেমন |কত |কী |কোন |কার )/.test(trimmed);
    const isEnglishQuestion = /^(what |who |when |where |why |how |which |can |could |should |do |does |did |is |are |will |would )/i.test(trimmed);
    
    // Only add ? if it's clearly a question AND doesn't have punctuation
    if ((isBanglaQuestion || isEnglishQuestion) && !/[।.?!]$/.test(trimmed)) {
      return line + '?';
    }
    
    return line;
  });
  
  return fixed.join('\n');
}

