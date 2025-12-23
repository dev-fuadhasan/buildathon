# scripts/simple_test.py
# =====================================================
# SIMPLE TEST OF DATABASE FUNCTIONALITY
# =====================================================

from supabase import create_client

# ---------- CONFIG ----------
SUPABASE_URL = "https://hkbkmkuixrrvjehqppdq.supabase.co"
SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrYmtta3VpeHJydmplaHFwcGRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjExMDU5NCwiZXhwIjoyMDgxNjg2NTk0fQ.kKb4vp6PhK3woLIPA-HtBGcpnMR_Ms6rTVeAGyzp16U"

# ---------- INIT ----------
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# ---------- TEST BASIC FUNCTIONALITY ----------
def test_basic():
    print("🔍 Testing basic database functionality...")
    
    try:
        # Test basic select
        response = supabase.table('qa_embeddings').select('qa_id, question, language').limit(3).execute()
        print(f"✅ Basic select works: {len(response.data)} records")
        for record in response.data:
            print(f"   - {record['language']}: {record['question'][:50]}...")
    except Exception as e:
        print(f"❌ Basic select failed: {e}")
    
    try:
        # Test count
        response = supabase.table('qa_embeddings').select('qa_id', count='exact').execute()
        print(f"✅ Count works: {response.count} records")
    except Exception as e:
        print(f"❌ Count failed: {e}")

if __name__ == "__main__":
    test_basic()
    print("\n🎉 Basic testing completed!")