// Test to check if environment variables are properly configured
console.log("Testing environment variables...");

// Check if HF_TOKEN is available
const hfToken = process.env.HF_TOKEN;
console.log("HF_TOKEN present:", !!hfToken);
if (hfToken) {
  console.log("HF_TOKEN length:", hfToken.length);
  console.log("HF_TOKEN starts with:", hfToken.substring(0, 10) + "...");
}

// Check if EMBEDDING_SERVICE_URL is available
const embeddingServiceUrl = process.env.EMBEDDING_SERVICE_URL;
console.log("EMBEDDING_SERVICE_URL present:", !!embeddingServiceUrl);
if (embeddingServiceUrl) {
  console.log("EMBEDDING_SERVICE_URL:", embeddingServiceUrl);
}

console.log("Environment test completed.");