"use client";

import { useState, useRef, useEffect } from "react";
import { getLanguage } from "@/lib/i18n";
import Icon from "@/components/Icon";
import Image from "next/image";

type Props = {
  onSend: (text: string) => Promise<void> | void;
  disabled?: boolean;
  onImageSelect?: (imageData: { file: File; preview: string }) => void;
  onImageRemove?: () => void;
  currentImage?: { file: File; preview: string } | null;
};

// Speech Recognition types
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function ChatInput({ onSend, disabled, onImageSelect, onImageRemove, currentImage }: Props) {
  const lang = getLanguage();
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [recognitionStatus, setRecognitionStatus] = useState<"idle" | "listening" | "processing">("idle");
  const recognitionRef = useRef<any>(null);
  const interimTextRef = useRef<string>("");
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const finalResultsRef = useRef<string[]>([]);

  const handleSend = async () => {
    const text = value.trim();
    // Allow sending if there's text OR an image
    if ((!text && !currentImage) || sending || disabled) return;
    setSending(true);
    try {
      // If image without text, add contextual message
      const messageToSend = text || (
        lang === "bn" 
          ? "এই ছবি দেখুন এবং বিশ্লেষণ করুন। আমার কোন পরামর্শ বা নির্দেশনা প্রয়োজন?" 
          : "Please see and analyze this image. What guidance or advice do I need?"
      );
      await onSend(messageToSend);
      setValue("");
    } finally {
      setSending(false);
    }
  };

  // Check if speech recognition is supported
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  // Helper function to normalize and improve text
  const normalizeText = (text: string, isFinal: boolean = false): string => {
    if (!text) return "";
    
    // Remove extra whitespace
    let normalized = text.trim().replace(/\s+/g, " ");
    
    // Auto-capitalize first letter of sentences
    if (isFinal) {
      // Capitalize first letter
      normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);
      
      // Ensure proper sentence endings
      if (!/[.!?]$/.test(normalized)) {
        normalized += ".";
      }
    }
    
    return normalized;
  };

  // Initialize speech recognition with enhanced settings
  const initializeSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    
    // Enhanced configuration for better accuracy
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1; // Get best alternative
    
    // Better language settings with fallbacks
    if (lang === "bn") {
      recognition.lang = "bn-BD"; // Primary: Bengali (Bangladesh)
      // Fallback languages can be set if needed
    } else {
      recognition.lang = "en-US"; // Primary: English (US)
      // Can add en-GB, en-AU as fallbacks if needed
    }

    recognition.onstart = () => {
      setIsListening(true);
      setRecognitionStatus("listening");
      setInterimText("");
      interimTextRef.current = "";
      finalResultsRef.current = [];
      
      // Clear any existing silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";
      let hasFinal = false;

      // Process all results from the current index
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript || "";
        const confidence = result[0]?.confidence || 0;
        
        // Only process if confidence is reasonable (>= 0.3) or if it's final
        if (result.isFinal || confidence >= 0.3) {
          if (result.isFinal) {
            const normalized = normalizeText(transcript, true);
            if (normalized) {
              finalTranscript += normalized + " ";
              hasFinal = true;
            }
          } else {
            // Interim result with good confidence
            const normalized = normalizeText(transcript, false);
            if (normalized) {
              interimTranscript += normalized;
            }
          }
        }
      }

      // Update interim text for real-time display
      if (interimTranscript) {
        interimTextRef.current = interimTranscript;
        setInterimText(interimTranscript);
        setRecognitionStatus("processing");
        
        // Reset silence timeout when we get new interim results
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        
        // Auto-stop after 3 seconds of silence (no new interim results)
        silenceTimeoutRef.current = setTimeout(() => {
          if (isListening && interimTextRef.current) {
            // Convert interim to final if user stopped speaking
            const currentInterim = interimTextRef.current.trim();
            if (currentInterim) {
              setValue((prev) => {
                const normalized = normalizeText(currentInterim, true);
                const newValue = prev + (prev && !prev.endsWith(" ") ? " " : "") + normalized;
                return newValue;
              });
            }
            stopListening();
          }
        }, 3000);
      }
      
      // Process final results
      if (hasFinal && finalTranscript) {
        setRecognitionStatus("listening");
        
        // Clear silence timeout since we got a final result
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }
        
        // Add final transcript to value
        setValue((prev) => {
          const normalizedFinal = finalTranscript.trim();
          // Ensure proper spacing
          const separator = prev && !prev.endsWith(" ") && !prev.endsWith(".") ? " " : "";
          const newValue = prev + separator + normalizedFinal;
          return newValue;
        });
        
        // Store final result
        finalResultsRef.current.push(finalTranscript.trim());
        
        // Clear interim text
        interimTextRef.current = "";
        setInterimText("");
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      
      // Clear silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      
      // Handle different error types professionally
      switch (event.error) {
        case "no-speech":
          // No speech detected - silently stop (user might not have spoken yet)
          setRecognitionStatus("idle");
          stopListening();
          break;
          
        case "audio-capture":
          // Microphone not available
          alert(
            lang === "bn" 
              ? "মাইক্রোফোন পাওয়া যায়নি। অনুগ্রহ করে মাইক্রোফোন অনুমতি দিন।" 
              : "Microphone not available. Please allow microphone access."
          );
          stopListening();
          break;
          
        case "not-allowed":
          // Permission denied
          alert(
            lang === "bn" 
              ? "মাইক্রোফোন অনুমতি প্রয়োজন। অনুগ্রহ করে ব্রাউজার সেটিংস থেকে অনুমতি দিন।" 
              : "Microphone permission required. Please allow microphone access in browser settings."
          );
          stopListening();
          break;
          
        case "network":
          // Network error
          alert(
            lang === "bn" 
              ? "নেটওয়ার্ক ত্রুটি। অনুগ্রহ করে ইন্টারনেট সংযোগ পরীক্ষা করুন।" 
              : "Network error. Please check your internet connection."
          );
          stopListening();
          break;
          
        case "aborted":
          // Recognition aborted - silently stop
          stopListening();
          break;
          
        default:
          // Other errors - show message but don't be too intrusive
          console.warn("Speech recognition error:", event.error);
          stopListening();
      }
    };

    recognition.onend = () => {
      setRecognitionStatus("idle");
      
      // Clear silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      
      // Add any remaining interim text as final
      const currentInterim = interimTextRef.current;
      if (currentInterim && currentInterim.trim()) {
        const normalized = normalizeText(currentInterim, true);
        setValue((prev) => {
          const separator = prev && !prev.endsWith(" ") && !prev.endsWith(".") ? " " : "";
          return prev + separator + normalized;
        });
      }
      
      interimTextRef.current = "";
      setInterimText("");
      setIsListening(false);
    };

    return recognition;
  };

  const startListening = () => {
    if (disabled || sending || isListening) return;

    if (!isSupported) {
      alert(
        lang === "bn" 
          ? "আপনার ব্রাউজার ভয়েস রেকগনিশন সমর্থন করে না। Chrome বা Edge ব্যবহার করুন।" 
          : "Your browser doesn't support speech recognition. Please use Chrome or Edge."
      );
      return;
    }

    // Request microphone permission if available (better UX)
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          // Permission granted, start recognition
          try {
            const recognition = initializeSpeechRecognition();
            if (recognition) {
              recognitionRef.current = recognition;
              recognition.start();
            }
          } catch (error) {
            console.error("Failed to start speech recognition:", error);
            alert(
              lang === "bn" 
                ? "ভয়েস রেকগনিশন শুরু করতে ব্যর্থ। অনুগ্রহ করে আবার চেষ্টা করুন।" 
                : "Failed to start speech recognition. Please try again."
            );
          }
        })
        .catch((err) => {
          console.error("Microphone permission denied:", err);
          alert(
            lang === "bn" 
              ? "মাইক্রোফোন অনুমতি প্রয়োজন। অনুগ্রহ করে ব্রাউজার সেটিংস থেকে অনুমতি দিন।" 
              : "Microphone permission required. Please allow microphone access in browser settings."
          );
        });
    } else {
      // Fallback for browsers without getUserMedia
      try {
        const recognition = initializeSpeechRecognition();
        if (recognition) {
          recognitionRef.current = recognition;
          recognition.start();
        }
      } catch (error) {
        console.error("Failed to start speech recognition:", error);
        alert(
          lang === "bn" 
            ? "ভয়েস রেকগনিশন শুরু করতে ব্যর্থ। অনুগ্রহ করে আবার চেষ্টা করুন।" 
            : "Failed to start speech recognition. Please try again."
        );
      }
    }
  };

  const stopListening = () => {
    // Clear silence timeout
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error("Error stopping recognition:", error);
      }
      recognitionRef.current = null;
    }
    
    setRecognitionStatus("idle");
    setIsListening(false);
    
    // Add any remaining interim text with proper formatting
    const currentInterim = interimTextRef.current;
    if (currentInterim && currentInterim.trim()) {
      const normalized = normalizeText(currentInterim, true);
      setValue((prev) => {
        const separator = prev && !prev.endsWith(" ") && !prev.endsWith(".") ? " " : "";
        return prev + separator + normalized;
      });
    }
    
    interimTextRef.current = "";
    setInterimText("");
    finalResultsRef.current = [];
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      
      // Stop recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          // Ignore errors during cleanup
        }
      }
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile || !onImageSelect) return;

    // Validate file type
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!validTypes.includes(selectedFile.type)) {
      alert(lang === "bn" ? "শুধুমাত্র PNG, JPG বা WEBP ছবি আপলোড করুন" : "Please upload PNG, JPG, or WEBP images only");
      return;
    }

    // Validate file size (5MB max for images)
    if (selectedFile.size > 5 * 1024 * 1024) {
      alert(lang === "bn" ? "ছবির সাইজ 5MB এর কম হতে হবে" : "Image size must be less than 5MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      onImageSelect({
        file: selectedFile,
        preview: reader.result as string,
      });
    };
    reader.readAsDataURL(selectedFile);

    // Reset input
    e.target.value = "";
  };

  return (
    <div className="space-y-2">
      {/* Image Preview (above input) */}
      {currentImage && (
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded overflow-hidden flex-shrink-0">
            <Image
              src={currentImage.preview}
              alt="Preview"
              fill
              className="object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-slate-700 truncate font-medium">{currentImage.file.name}</p>
            <p className="text-xs text-slate-400">
              {(currentImage.file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <button
            onClick={onImageRemove}
            disabled={disabled}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title={lang === "bn" ? "মুছে ফেলুন" : "Remove"}
          >
            <Icon name="close" size={18} />
          </button>
        </div>
      )}

      {/* Input Row - Properly Aligned (All elements exactly 48px height) */}
      <div className="flex gap-2 sm:gap-2 items-center">
        {/* Image Attachment Button - LEFT SIDE (48px) */}
        {onImageSelect && (
          <>
            <label 
              htmlFor="chat-image-input" 
              className={`flex-shrink-0 w-[44px] h-[44px] sm:w-[48px] sm:h-[48px] flex items-center justify-center rounded-lg border-2 transition-all touch-manipulation ${
                disabled 
                  ? "border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50" 
                  : "border-slate-300 text-slate-600 hover:text-pink-600 hover:border-pink-400 hover:bg-pink-50 cursor-pointer active:scale-95"
              }`}
              title={lang === "bn" ? "ছবি যুক্ত করুন" : "Attach image"}
            >
              <Icon name="add" size={20} className="sm:w-[22px] sm:h-[22px]" />
            </label>
            <input
              id="chat-image-input"
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleFileChange}
              disabled={disabled}
              className="hidden"
            />
          </>
        )}

        {/* Voice Input Button - LEFT SIDE (48px) */}
        {isSupported && (
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={disabled || sending}
            className={`flex-shrink-0 w-[44px] h-[44px] sm:w-[48px] sm:h-[48px] flex items-center justify-center rounded-lg border-2 transition-all touch-manipulation relative ${
              disabled || sending
                ? "border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50"
                : isListening
                ? recognitionStatus === "processing"
                  ? "border-green-400 text-green-600 bg-green-50 animate-pulse"
                  : "border-red-400 text-red-600 bg-red-50 animate-pulse"
                : "border-slate-300 text-slate-600 hover:text-pink-600 hover:border-pink-400 hover:bg-pink-50 cursor-pointer active:scale-95"
            }`}
            title={
              isListening
                ? (lang === "bn" ? "শুনা বন্ধ করুন" : "Stop listening")
                : (lang === "bn" ? "ভয়েস দিয়ে টাইপ করুন" : "Voice to text")
            }
            type="button"
          >
            {isListening ? (
              <svg width="20" height="20" className="sm:w-[22px] sm:h-[22px] animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2s-2 .9-2 2v8c0 1.1.9 2 2 2zm5-3c0 2.8-2.2 5-5 5s-5-2.2-5-5H5c0 3.3 2.7 6 6 6v2h2v-2c3.3 0 6-2.7 6-6h-2z"/>
              </svg>
            ) : (
              <svg width="20" height="20" className="sm:w-[22px] sm:h-[22px]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2s-2 .9-2 2v8c0 1.1.9 2 2 2zm5-3c0 2.8-2.2 5-5 5s-5-2.2-5-5H5c0 3.3 2.7 6 6 6v2h2v-2c3.3 0 6-2.7 6-6h-2z"/>
              </svg>
            )}
          </button>
        )}

        {/* Text Input - CENTER (Fixed 48px height with auto-wrap) */}
        <div className="flex-1 relative min-w-0 h-[44px] sm:h-[48px] flex items-center">
          <textarea
            className="resize-none text-sm sm:text-sm px-3 sm:px-4 w-full h-full rounded-xl border-2 border-neutral-200 bg-white shadow-sm transition-all duration-200 focus:border-pink-400 focus:outline-none focus:ring-4 focus:ring-pink-100 hover:border-neutral-300 placeholder:text-neutral-400 disabled:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder={
              isListening
                ? recognitionStatus === "processing"
                  ? (lang === "bn" ? "প্রক্রিয়াকরণ হচ্ছে..." : "Processing your speech...")
                  : (lang === "bn" ? "শুনছি... কথা বলুন" : "Listening... speak now")
                : (lang === "bn" ? "বার্তা টাইপ করুন..." : "Type message...")
            }
            value={value + (isListening && interimText ? " " + interimText : "")}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (isListening) {
                  stopListening();
                }
                handleSend();
              }
            }}
            disabled={sending || disabled}
            rows={2}
            style={{ 
              height: '100%',
              minHeight: '44px',
              maxHeight: '44px',
              overflowY: 'auto',
              overflowX: 'hidden',
              paddingTop: '10px',
              paddingBottom: '10px',
              boxSizing: 'border-box',
              lineHeight: '1.4',
              wordWrap: 'break-word',
              whiteSpace: 'pre-wrap',
              fontSize: '14px'
            }}
          />
          {/* Enhanced Listening indicator */}
          {isListening && (
            <div className="absolute right-2 sm:right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 sm:gap-2">
              <div className="relative">
                <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${
                  recognitionStatus === "processing" 
                    ? "bg-green-500 animate-pulse" 
                    : "bg-red-500 animate-pulse"
                }`}></div>
                {recognitionStatus === "processing" && (
                  <div className="absolute inset-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-400 animate-ping"></div>
                )}
              </div>
              <span className={`text-xs font-medium hidden sm:inline ${
                recognitionStatus === "processing" ? "text-green-600" : "text-red-600"
              }`}>
                {recognitionStatus === "processing" 
                  ? (lang === "bn" ? "প্রক্রিয়াকরণ..." : "Processing...")
                  : (lang === "bn" ? "শুনছি..." : "Listening...")
                }
              </span>
            </div>
          )}
        </div>

        {/* Send Button - RIGHT SIDE (48px) */}
        <button
          onClick={() => {
            if (isListening) {
              stopListening();
            }
            handleSend();
          }}
          disabled={sending || disabled || (!value.trim() && !currentImage)}
          className="flex-shrink-0 h-[44px] sm:h-[48px] px-3 sm:px-4 btn-primary flex items-center justify-center min-w-[70px] sm:min-w-[80px] text-xs sm:text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          title={lang === "bn" ? "পাঠান" : "Send"}
        >
          {sending ? (
            <Icon name="pending" size={16} className="sm:w-[18px] sm:h-[18px] animate-spin brightness-0 invert" />
          ) : (
            <>
              <span className="hidden sm:inline">Send</span>
              <Icon name="upload" size={16} className="sm:w-[18px] sm:h-[18px] brightness-0 invert sm:ml-1" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

