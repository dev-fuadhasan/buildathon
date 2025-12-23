# scripts/check_qa_duplicates.py
# =====================================================
# CHECK FOR DUPLICATE QUESTION-ANSWER PAIRS IN SUPABASE
# =====================================================

import json
from supabase import create_client

# ---------- CONFIG ----------
SUPABASE_URL = "https://hkbkmkuixrrvjehqppdq.supabase.co"
SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrYmtta3VpeHJydmplaHFwcGRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjExMDU5NCwiZXhwIjoyMDgxNjg2NTk0fQ.kKb4vp6PhK3woLIPA-HtBGcpnMR_Ms6rTVeAGyzp16U"

# ---------- INIT ----------
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# ---------- CHECK FOR QA DUPLICATES ----------
def check_qa_duplicates():
    print("🔍 Checking for duplicate question-answer pairs...")
    
    # Get all records (handle pagination)
    all_records = []
    page = 0
    batch_size = 1000
    
    while True:
        response = supabase.table('qa_embeddings').select('qa_id, question, answer, language').range(
            page * batch_size, 
            (page + 1) * batch_size - 1
        ).execute()
        
        if not response.data:
            break
            
        all_records.extend(response.data)
        print(f"📥 Page {page + 1}: {len(response.data)} records")
        page += 1
        
        # Safety break to avoid infinite loop
        if page > 100:  # Max 100,000 records
            break
    
    print(f"📊 Total records retrieved: {len(all_records)}")
    
    # Create QA pairs and check for duplicates
    qa_pairs = {}
    duplicates = []
    
    for record in all_records:
        # Create a unique key for the QA pair
        qa_key = (record['question'].strip(), record['answer'].strip(), record['language'])
        
        if qa_key in qa_pairs:
            # This is a duplicate
            duplicates.append({
                'duplicate_id': record['qa_id'],
                'original_id': qa_pairs[qa_key]['qa_id'],
                'question': record['question'],
                'answer': record['answer'],
                'language': record['language']
            })
        else:
            # Store the first occurrence
            qa_pairs[qa_key] = record
    
    print(f"🔢 Unique QA pairs: {len(qa_pairs)}")
    print(f"🔄 Duplicate QA pairs: {len(duplicates)}")
    
    if len(duplicates) > 0:
        print("⚠️ Duplicates detected!")
        print("📋 First 10 duplicates:")
        for i, dup in enumerate(duplicates[:10]):
            print(f"  {i+1}. ID: {dup['duplicate_id']} (duplicate of {dup['original_id']})")
            print(f"     Q: {dup['question'][:50]}...")
            print(f"     Lang: {dup['language']}")
        return duplicates
    else:
        print("✅ No duplicate question-answer pairs found!")
        return []

# ---------- REMOVE DUPLICATES ----------
def remove_duplicates(duplicates):
    if not duplicates:
        print("✅ No duplicates to remove!")
        return
    
    print(f"🗑️ Removing {len(duplicates)} duplicate records...")
    
    # Extract duplicate IDs to delete
    duplicate_ids = [dup['duplicate_id'] for dup in duplicates]
    
    # Delete in batches to avoid overwhelming the API
    batch_size = 100
    deleted_count = 0
    
    for i in range(0, len(duplicate_ids), batch_size):
        batch = duplicate_ids[i:i + batch_size]
        
        try:
            response = supabase.table('qa_embeddings').delete().in_('qa_id', batch).execute()
            deleted_count += len(batch)
            print(f"✅ Deleted batch of {len(batch)} duplicates ({deleted_count}/{len(duplicate_ids)})")
        except Exception as e:
            print(f"❌ Error deleting batch: {e}")
    
    print(f"🎉 Successfully removed {deleted_count} duplicate records!")

if __name__ == "__main__":
    duplicates = check_qa_duplicates()
    if duplicates:
        user_input = input("\nDo you want to remove these duplicates? (y/N): ")
        if user_input.lower() == 'y':
            remove_duplicates(duplicates)
        else:
            print("⏭️ Skipping duplicate removal.")