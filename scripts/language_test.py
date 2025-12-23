import requests
import json

# Test language handling for Bangla, Banglish, and English
url = "https://momscareai.vercel.app/api/chat"

# Test cases for different languages
test_cases = [
    {
        "name": "English → English",
        "message": "What should I do if I miss a birth control pill?",
        "expected_language": "English response"
    },
    {
        "name": "Bangla → Bangla", 
        "message": "গর্ভাবস্থায় কি ধরনের খাবার খাওয়া উচিত?",
        "expected_language": "Bangla response"
    },
    {
        "name": "Banglish → Bangla",
        "message": "Ami pregnant hole ki khabar khawa uchit?",
        "expected_language": "Bangla response"
    }
]

print("Testing language handling in chat API...\n")

for i, test_case in enumerate(test_cases, 1):
    print(f"{i}. {test_case['name']}")
    print(f"   Query: {test_case['message']}")
    
    payload = {
        "messages": [
            {
                "role": "user",
                "content": test_case['message']
            }
        ]
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(url, data=json.dumps(payload), headers=headers)
        response.raise_for_status()
        
        result = response.json()
        reply = result.get('reply', '')
        
        print(f"   ✅ Success - Reply ({len(reply)} chars):")
        
        # Show first 200 characters to identify language
        preview = reply[:200]
        print(f"   Preview: {preview}{'...' if len(reply) > 200 else ''}")
        
        # Simple language detection
        has_bangla = any(ord(char) > 128 for char in reply[:100])
        if has_bangla:
            detected_lang = "Bangla"
        else:
            detected_lang = "English"
            
        print(f"   Detected language: {detected_lang}")
        print(f"   Safety warning: {result.get('safetyWarning', False)}")
        print(f"   Risk level: {result.get('riskLevel', 'unknown')}\n")
        
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Request Error: {e}\n")
    except Exception as e:
        print(f"   ❌ Unexpected error: {e}\n")

print("Language testing completed!")