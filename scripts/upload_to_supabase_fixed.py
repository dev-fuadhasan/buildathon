# scripts/upload_to_supabase_fixed.py
# =====================================================
# FIXED UPSERT UPLOADER FOR SUPABASE (NO DUPLICATES)
# =====================================================

import json
import time
from supabase import create_client

# ---------- CONFIG ----------
SUPABASE_URL = "https://hkbkmkuixrrvjehqppdq.supabase.co"
SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrYmtta3VpeHJydmplaHFwcGRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjExMDU5NCwiZXhwIjoyMDgxNjg2NTk0fQ.kKb4vp6PhK3woLIPA-HtBGcpnMR_Ms6rTVeAGyzp16U"

INPUT_FILE = "embeddings_output.json"
BATCH_SIZE = 50  # Reduced batch size to avoid issues
# ---------------------------

# ---------- INIT ----------
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# ---------- LOAD ----------
with open(INPUT_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)

print(f"📦 Loaded {len(data)} embedding records")

# Filter out any records that might be causing issues
filtered_data = []
for record in data:
    # Ensure all required fields are present
    if all(key in record for key in ['qa_id', 'question', 'answer', 'content', 'embedding']):
        filtered_data.append(record)

print(f"🔍 Filtered to {len(filtered_data)} valid records")

# ---------- UPSERT ----------
successful_batches = 0
failed_batches = 0

for i in range(0, len(filtered_data), BATCH_SIZE):
    batch = filtered_data[i : i + BATCH_SIZE]
    
    try:
        # Add a small delay to avoid rate limiting
        time.sleep(0.1)
        
        response = (
            supabase
            .table("qa_embeddings")
            .upsert(
                batch,
                on_conflict="qa_id"
            )
            .execute()
        )
        
        successful_batches += 1
        print(f"✅ Batch {i//BATCH_SIZE + 1} upserted ({len(batch)} records)")
        
    except Exception as e:
        failed_batches += 1
        print(f"❌ Batch {i//BATCH_SIZE + 1} failed: {str(e)}")
        # Print first record in batch for debugging
        if batch:
            print(f"   First record ID: {batch[0].get('qa_id', 'unknown')}")

print(f"\n📊 Upload Summary:")
print(f"   Successful batches: {successful_batches}")
print(f"   Failed batches: {failed_batches}")
print(f"   Total records processed: {len(filtered_data)}")

if successful_batches > 0:
    print("\n🎉 EMBEDDINGS UPLOAD COMPLETED")
else:
    print("\n💥 UPLOAD FAILED - No batches succeeded")