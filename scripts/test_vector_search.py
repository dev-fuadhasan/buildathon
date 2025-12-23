# scripts/test_vector_search.py
# =====================================================
# TEST VECTOR SEARCH FUNCTIONALITY
# =====================================================

import json
from supabase import create_client

# ---------- CONFIG ----------
SUPABASE_URL = "https://hkbkmkuixrrvjehqppdq.supabase.co"
SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrYmtta3VpeHJydmplaHFwcGRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjExMDU5NCwiZXhwIjoyMDgxNjg2NTk0fQ.kKb4vp6PhK3woLIPA-HtBGcpnMR_Ms6rTVeAGyzp16U"

# ---------- INIT ----------
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# ---------- TEST VECTOR SEARCH ----------
def test_vector_search():
    print("🔍 Testing vector search functionality...")
    
    # Test queries in English
    test_queries_en = [
        "What should I do if I miss a birth control pill?",
        "How can I tell if I'm in labor?",
        "What are the signs of postpartum depression?",
        "How much sleep does a 4-month-old baby need?"
    ]
    
    # Test queries in Bengali
    test_queries_bn = [
        "জন্ম নিয়ন্ত্রণ বড়ি মিস করলে আমি কী করব?",
        "আমি কীভাবে বুঝতে পারব যে আমি প্রসবে আছি?",
        "প্রসবোত্তর অবসাদের লক্ষণগুলো কী কী?",
        "৪ মাসে একটি শিশুর কত ঘুম প্রয়োজন?"
    ]
    
    print("\n=== ENGLISH QUERIES ===")
    for query in test_queries_en:
        print(f"\n📝 Query: {query}")
        try:
            # Create a mock embedding (just for testing the RPC function)
            mock_embedding = [0.1] * 384  # 384-dimensional embedding
            
            response = supabase.rpc('semantic_search_384', {
                'query_embedding': mock_embedding,
                'similarity_threshold': 0.2,
                'limit_results': 3
            }).execute()
            
            if response.data:
                print(f"✅ Found {len(response.data)} results")
                for i, result in enumerate(response.data[:2]):  # Show top 2
                    print(f"   {i+1}. Similarity: {result.get('similarity', 'N/A'):.3f}")
                    print(f"      Q: {result.get('question', '')[:100]}...")
            else:
                print("⚠️ No results found")
        except Exception as e:
            print(f"❌ Error: {e}")
    
    print("\n=== BENGALI QUERIES ===")
    for query in test_queries_bn:
        print(f"\n📝 Query: {query}")
        try:
            # Create a mock embedding (just for testing the RPC function)
            mock_embedding = [0.1] * 384  # 384-dimensional embedding
            
            response = supabase.rpc('semantic_search_384', {
                'query_embedding': mock_embedding,
                'similarity_threshold': 0.2,
                'limit_results': 3
            }).execute()
            
            if response.data:
                print(f"✅ Found {len(response.data)} results")
                for i, result in enumerate(response.data[:2]):  # Show top 2
                    print(f"   {i+1}. Similarity: {result.get('similarity', 'N/A'):.3f}")
                    print(f"      Q: {result.get('question', '')[:100]}...")
            else:
                print("⚠️ No results found")
        except Exception as e:
            print(f"❌ Error: {e}")

# ---------- VERIFY DATABASE STATE ----------
def verify_database():
    print("📊 Verifying database state...")
    
    try:
        # Count total records
        response = supabase.table('qa_embeddings').select('qa_id', count='exact').execute()
        print(f"📈 Total records: {response.count}")
        
        # Count by language
        response_en = supabase.table('qa_embeddings').select('qa_id', count='exact').eq('language', 'en').execute()
        response_bn = supabase.table('qa_embeddings').select('qa_id', count='exact').eq('language', 'bn').execute()
        print(f"🇬🇧 English records: {response_en.count}")
        print(f"🇧🇩 Bengali records: {response_bn.count}")
        
        # Check if RPC function exists
        print("🔧 Checking RPC functions...")
        # This is just a basic check - we'll test the actual function in the search test
        
        print("✅ Database verification complete!")
        
    except Exception as e:
        print(f"❌ Database verification failed: {e}")

if __name__ == "__main__":
    verify_database()
    test_vector_search()
    print("\n🎉 Vector search testing completed!")