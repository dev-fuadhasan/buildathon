import requests
import json

# Test English response specifically
url = "https://momscareai.vercel.app/api/chat"

# English test case
test_case = {
    "name": "English → English",
    "message": "How much sleep does a newborn baby need?",
    "expected_language": "English response"
}

print(f"Testing: {test_case['name']}")
print(f"Query: {test_case['message']}")

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
    
    print(f"✅ Success - Reply ({len(reply)} chars):")
    
    # Show the full response to verify it's in English
    print(f"Full reply:\n{reply}")
    
    # Verify it's English (ASCII characters mostly)
    non_ascii_count = sum(1 for char in reply[:100] if ord(char) > 127)
    ascii_percentage = (1 - non_ascii_count / min(100, len(reply))) * 100 if reply else 100
    
    print(f"\nLanguage analysis:")
    print(f"  ASCII characters in first 100 chars: {100 - non_ascii_count}/100 ({ascii_percentage:.1f}%)")
    
    if ascii_percentage > 90:
        print("  🟢 Confirmed: Response is in English")
    else:
        print("  🟡 Possible: Response contains non-English characters")
    
    print(f"Safety warning: {result.get('safetyWarning', False)}")
    print(f"Risk level: {result.get('riskLevel', 'unknown')}")
    
except requests.exceptions.RequestException as e:
    print(f"❌ Request Error: {e}")
except Exception as e:
    print(f"❌ Unexpected error: {e}")

print("\nTest completed!")