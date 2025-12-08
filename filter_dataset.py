import pandas as pd

# Load the original dataset
df = pd.read_csv("knowledge_base.csv")

# Pregnancy-related keywords
keywords = ["pregnan", "maternal", "mother", "antenatal", "prenatal", "postnatal", "obstetric"]

# Keep only relevant rows
mask = (
    df["content_chunk"].str.lower().str.contains("|".join(keywords), na=False) |
    df["tags"].str.lower().str.contains("|".join(keywords), na=False)
)

preg_df = df[mask]

# Save cleaned dataset
preg_df.to_csv("knowledge_base_cleaned.csv", index=False)
print("✓ Cleaned dataset created: knowledge_base_cleaned.csv")
print(f"✓ Rows kept: {preg_df.shape[0]}")
print(f"✓ Rows removed: {df.shape[0] - preg_df.shape[0]}")

