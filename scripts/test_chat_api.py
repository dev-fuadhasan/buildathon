import requests
import json

# Test the chat API with different languages
url = "https://momscareai.vercel.app/api/chat"

# Test cases
test_cases = [
    {
        "name": "English",
        "message": "What should I do if I miss a birth control pill?"
    },
    {
        "name": "Bengali",
        "message": "জন্ম নিয়ন্ত্রণ বড়ি মিস করলে আমি কী করব?"
    },
    {
        "name": "Banglish",
        "message": "Ami gorvoboti ki na kivabe bujbo?"
    }
]

print("Testing chat API with different languages...\n")

for test_case in test_cases:
    print(f"Testing {test_case['name']} query: {test_case['message']}")
    
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
        print(f"✅ Success - Reply: {result.get('reply', 'No reply')[:100]}...")
        print(f"   Safety warning: {result.get('safetyWarning', False)}")
        print(f"   Risk level: {result.get('riskLevel', 'unknown')}\n")
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Error: {e}\n")
    except Exception as e:
        print(f"❌ Unexpected error: {e}\n")

print("Test completed!")