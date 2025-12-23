import requests
import json

# Test the chat API with detailed inspection
url = "https://momscareai.vercel.app/api/chat"

# Test case with a specific query that should have good vector search results
test_message = "What are the signs of postpartum depression?"

print(f"Testing detailed query: {test_message}")
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
    print(f"Response keys: {list(result.keys())}")
    print(f"Reply length: {len(result.get('reply', ''))} characters")
    print(f"Safety warning: {result.get('safetyWarning', False)}")
    print(f"Risk level: {result.get('riskLevel', 'unknown')}")
    
    # Show first 500 characters of the reply
    reply = result.get('reply', '')
    print(f"\nReply preview: {reply[:500]}{'...' if len(reply) > 500 else ''}")
    
    # Test another query to see variation
    print("\n" + "=" * 60)
    test_message2 = "How much sleep does a 4-month-old baby need?"
    print(f"Testing second query: {test_message2}")
    
    payload2 = {
        "messages": [
            {
                "role": "user",
                "content": test_message2
            }
        ]
    }
    
    response2 = requests.post(url, data=json.dumps(payload2), headers=headers)
    response2.raise_for_status()
    
    result2 = response2.json()
    reply2 = result2.get('reply', '')
    print(f"✅ Second response received ({len(reply2)} characters)")
    print(f"Reply preview: {reply2[:300]}{'...' if len(reply2) > 300 else ''}")
    
except requests.exceptions.RequestException as e:
    print(f"❌ Request Error: {e}")
except Exception as e:
    print(f"❌ Unexpected error: {e}")

print("\nTest completed!")