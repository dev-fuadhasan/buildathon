import requests
import json

# Test to see if we can get insight into vector search results
url = "https://momscareai.vercel.app/api/chat"

# Simple query that should have clear vector search results
test_message = "What causes morning sickness during pregnancy?"

print(f"Testing vector search integration: {test_message}")
print("=" * 60)

payload = {
    "messages": [
        {
            "role": "user",
            "content": test_message
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
    print(f"✅ API Response received")
    print(f"Reply length: {len(result.get('reply', ''))} characters")
    print(f"Safety warning: {result.get('safetyWarning', False)}")
    print(f"Risk level: {result.get('riskLevel', 'unknown')}")
    
    reply = result.get('reply', '')
    print(f"\nFull reply:\n{reply}")
    
    # Look for specific indicators that vector search data was used
    indicators = [
        "hormone", "hcg", "estrogen", "progesterone", 
        "gastrointestinal", "digestive", "nausea", "vomiting"
    ]
    
    found_indicators = [word for word in indicators if word.lower() in reply.lower()]
    if found_indicators:
        print(f"\n🔍 Found medical terminology suggesting vector search data was used: {found_indicators}")
    else:
        print("\n⚠️ No clear medical terminology found - may be general AI response")
    
except requests.exceptions.RequestException as e:
    print(f"❌ Request Error: {e}")
except Exception as e:
    print(f"❌ Unexpected error: {e}")

print("\nTest completed!")