# scripts/upload_to_supabase.py
# =====================================================
# SAFE UPSERT UPLOADER FOR SUPABASE (NO DUPLICATES)
# =====================================================

import json
from supabase import create_client

# ---------- CONFIG ----------
SUPABASE_URL = "https://hkbkmkuixrrvjehqppdq.supabase.co"
SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrYmtta3VpeHJydmplaHFwcGRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjExMDU5NCwiZXhwIjoyMDgxNjg2NTk0fQ.kKb4vp6PhK3woLIPA-HtBGcpnMR_Ms6rTVeAGyzp16U"

INPUT_FILE = "embeddings_output.json"
BATCH_SIZE = 100
# ---------------------------

# ---------- INIT ----------
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# ---------- LOAD ----------
with open(INPUT_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)

print(f"📦 Loaded {len(data)} embedding records")

# ---------- UPSERT ----------
for i in range(0, len(data), BATCH_SIZE):
    batch = data[i : i + BATCH_SIZE]

    response = (
        supabase
        .table("qa_embeddings")
        .upsert(
            batch,
            on_conflict="qa_id"  # 👈 KEY FIX
        )
        .execute()
    )

    print(f"✅ Batch {i//BATCH_SIZE + 1} upserted ({len(batch)} records)")

print("\n🎉 ALL EMBEDDINGS SYNCED SUCCESSFULLY")
