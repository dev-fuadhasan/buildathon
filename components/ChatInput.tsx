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
  const recognitionRef = useRef<any>(null);
  const interimTextRef = useRef<string>("");

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

  // Initialize speech recognition
  const initializeSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang === "bn" ? "bn-BD" : "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      setInterimText("");
      interimTextRef.current = "";
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }

      interimTextRef.current = interimTranscript;
      setInterimText(interimTranscript);
      
      if (finalTranscript) {
        setValue((prev) => {
          const newValue = prev + (prev ? " " : "") + finalTranscript.trim();
          return newValue;
        });
        interimTextRef.current = "";
        setInterimText("");
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "no-speech" || event.error === "audio-capture") {
        // These are common errors, just stop listening
        stopListening();
      } else {
        alert(
          lang === "bn" 
            ? `ভয়েস রেকগনিশন ত্রুটি: ${event.error}` 
            : `Speech recognition error: ${event.error}`
        );
        stopListening();
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      // Interim text will be added in onresult when final, or we'll add it here if recognition ends
      setInterimText((currentInterim) => {
        if (currentInterim) {
          setValue((prev) => {
            const newValue = prev + (prev ? " " : "") + currentInterim.trim();
            return newValue;
          });
        }
        return "";
      });
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
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error("Error stopping recognition:", error);
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    
    // Add any remaining interim text
    const currentInterim = interimTextRef.current;
    if (currentInterim && currentInterim.trim()) {
      setValue((prev) => {
        const newValue = prev + (prev ? " " : "") + currentInterim.trim();
        return newValue;
      });
    }
    interimTextRef.current = "";
    setInterimText("");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
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
      <div className="flex gap-2 items-center">
        {/* Image Attachment Button - LEFT SIDE (48px) */}
        {onImageSelect && (
          <>
            <label 
              htmlFor="chat-image-input" 
              className={`flex-shrink-0 w-[48px] h-[48px] flex items-center justify-center rounded-lg border-2 transition-all touch-manipulation ${
                disabled 
                  ? "border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50" 
                  : "border-slate-300 text-slate-600 hover:text-pink-600 hover:border-pink-400 hover:bg-pink-50 cursor-pointer active:scale-95"
              }`}
              title={lang === "bn" ? "ছবি যুক্ত করুন" : "Attach image"}
            >
              <Icon name="add" size={22} />
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
            className={`flex-shrink-0 w-[48px] h-[48px] flex items-center justify-center rounded-lg border-2 transition-all touch-manipulation ${
              disabled || sending
                ? "border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50"
                : isListening
                ? "border-red-400 text-red-600 bg-red-50 animate-pulse"
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
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="animate-pulse">
                <path d="M12 14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2s-2 .9-2 2v8c0 1.1.9 2 2 2zm5-3c0 2.8-2.2 5-5 5s-5-2.2-5-5H5c0 3.3 2.7 6 6 6v2h2v-2c3.3 0 6-2.7 6-6h-2z"/>
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2s-2 .9-2 2v8c0 1.1.9 2 2 2zm5-3c0 2.8-2.2 5-5 5s-5-2.2-5-5H5c0 3.3 2.7 6 6 6v2h2v-2c3.3 0 6-2.7 6-6h-2z"/>
              </svg>
            )}
          </button>
        )}

        {/* Text Input - CENTER (Fixed 48px height with auto-wrap) */}
        <div className="flex-1 relative min-w-0 h-[48px] flex items-center">
          <textarea
            className="resize-none text-sm px-3 sm:px-4 w-full h-full rounded-xl border-2 border-neutral-200 bg-white shadow-sm transition-all duration-200 focus:border-pink-400 focus:outline-none focus:ring-4 focus:ring-pink-100 hover:border-neutral-300 placeholder:text-neutral-400 disabled:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder={
              isListening
                ? (lang === "bn" ? "শুনছি... কথা বলুন" : "Listening... speak now")
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
              height: '48px',
              minHeight: '48px',
              maxHeight: '48px',
              overflowY: 'auto',
              overflowX: 'hidden',
              paddingTop: '10px',
              paddingBottom: '10px',
              boxSizing: 'border-box',
              lineHeight: '1.4',
              wordWrap: 'break-word',
              whiteSpace: 'pre-wrap'
            }}
          />
          {/* Listening indicator */}
          {isListening && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-red-600 font-medium hidden sm:inline">
                {lang === "bn" ? "শুনছি" : "Listening"}
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
          className="flex-shrink-0 h-[48px] px-4 btn-primary flex items-center justify-center min-w-[80px] text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          title={lang === "bn" ? "পাঠান" : "Send"}
        >
          {sending ? (
            <Icon name="pending" size={18} className="animate-spin brightness-0 invert" />
          ) : (
            <Icon name="upload" size={18} className="brightness-0 invert" />
          )}
        </button>
      </div>
    </div>
  );
}

