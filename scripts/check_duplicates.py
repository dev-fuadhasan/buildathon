# scripts/check_duplicates.py
# =====================================================
# CHECK FOR DUPLICATE RECORDS IN SUPABASE
# =====================================================

import json
from supabase import create_client

# ---------- CONFIG ----------
SUPABASE_URL = "https://hkbkmkuixrrvjehqppdq.supabase.co"
SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrYmtta3VpeHJydmplaHFwcGRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjExMDU5NCwiZXhwIjoyMDgxNjg2NTk0fQ.kKb4vp6PhK3woLIPA-HtBGcpnMR_Ms6rTVeAGyzp16U"

# ---------- INIT ----------
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# ---------- CHECK FOR DUPLICATES ----------
def check_duplicates():
    print("🔍 Checking for duplicate records...")
    
    # Get all records (handle pagination)
    all_records = []
    page = 0
    batch_size = 1000
    
    while True:
        response = supabase.table('qa_embeddings').select('qa_id').range(
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
    
    # Extract IDs
    ids = [record['qa_id'] for record in all_records]
    unique_ids = set(ids)
    
    print(f"🔢 Unique IDs: {len(unique_ids)}")
    print(f"🔄 Duplicate count: {len(ids) - len(unique_ids)}")
    
    if len(ids) == len(unique_ids):
        print("✅ No duplicates found!")
        return False
    else:
        print("⚠️ Duplicates detected!")
        # Find duplicate IDs
        seen = set()
        duplicates = set()
        for id in ids:
            if id in seen:
                duplicates.add(id)
            else:
                seen.add(id)
        
        print(f"📋 Found {len(duplicates)} duplicate IDs")
        return True

if __name__ == "__main__":
    check_duplicates()