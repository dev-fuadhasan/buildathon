# scripts/convert_and_upload.py
# =====================================================
# CONVERT AND UPLOAD SCRIPT FOR SUPABASE
# Converts new data format to match existing database schema
# =====================================================

import json
import time
from supabase import create_client

# ---------- CONFIG ----------
SUPABASE_URL = "https://hkbkmkuixrrvjehqppdq.supabase.co"
SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrYmtta3VpeHJydmplaHFwcGRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjExMDU5NCwiZXhwIjoyMDgxNjg2NTk0fQ.kKb4vp6PhK3woLIPA-HtBGcpnMR_Ms6rTVeAGyzp16U"

INPUT_FILE = "embeddings_output.json"
BATCH_SIZE = 50
# ---------------------------

# ---------- INIT ----------
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# ---------- LOAD ----------
with open(INPUT_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)

print(f"📦 Loaded {len(data)} embedding records")

# ---------- CONVERT ----------
converted_data = []
for record in data:
    # Convert to match existing database schema
    converted_record = {
        "qa_id": record["qa_id"],
        "question": record["question"],
        "answer": record["answer"],
        "embedding": record["embedding"],
        "language": record["language"],
        "category": record["category"],
        "metadata": {
            "context": record.get("context", record["category"]),
            "severity": record.get("severity", "normal"),
            "trimester": record.get("trimester"),
            "source": record.get("source", "dataset"),
            "keywords": record.get("keywords", [])
        },
        # created_at and updated_at will be set by Supabase
    }
    converted_data.append(converted_record)

print(f"🔄 Converted {len(converted_data)} records to match database schema")

# ---------- UPSERT ----------
successful_batches = 0
failed_batches = 0

for i in range(0, len(converted_data), BATCH_SIZE):
    batch = converted_data[i : i + BATCH_SIZE]
    
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
print(f"   Total records processed: {len(converted_data)}")

if successful_batches > 0:
    print("\n🎉 EMBEDDINGS UPLOAD COMPLETED")
else:
    print("\n💥 UPLOAD FAILED - No batches succeeded")

# ---------- VERIFY ----------
try:
    response = supabase.table('qa_embeddings').select('qa_id', count='exact').execute()
    print(f"\n📈 Total records in database after upload: {response.count}")
except Exception as e:
    print(f"\n❓ Could not verify count: {e}")