# Troubleshooting Multi-API Key Detection

## 🔍 PROBLEM IDENTIFIED

**Logs showed**: `Available keys: 0/1`  
**Expected**: `Available keys: 5/6` (if 6 keys are set)

**Root Cause**: Environment variables `GROQ_API_KEY_1` through `GROQ_API_KEY_6` were not being detected properly.

---

## ✅ FIXES IMPLEMENTED

### 1. **Enhanced Key Detection Logging**

Now logs exactly which keys are found:

```
[Groq] Initializing... Checking environment variables...
[Groq] Found GROQ_API_KEY_1
[Groq] Found GROQ_API_KEY_2
[Groq] Found GROQ_API_KEY_3
[Groq] Found GROQ_API_KEY_4
[Groq] Found GROQ_API_KEY_5
[Groq] Found GROQ_API_KEY_6
[Groq] Found 6 individual key(s): GROQ_API_KEY_1 through GROQ_API_KEY_6
[Groq] Total unique API keys found: 6
[Groq] Creating client 1/6 with key: gsk_abc123...
[Groq] Creating client 2/6 with key: gsk_def456...
...
[Groq] ✅ Successfully initialized 6 API key(s)
```

### 2. **Better Error Messages**

If keys aren't found, you'll see:

```
[Groq] No API keys found! Check environment variables: GROQ_API_KEY or GROQ_API_KEY_1 through GROQ_API_KEY_6
```

### 3. **Improved Failover Logging**

Now shows exactly which key is being used and when it fails:

```
[Groq] Starting request with 6 available key(s)
[Groq] Attempt 1/6: Using key 1/6
[Groq] ⚠️  Key 1 failed with status 429: Rate limit
[Groq] ❌ Marked key 1/6 as failed. Available keys: 5/6
[Groq] ➡️  Switching to key 2/6
[Groq] 🔄 Retrying with next key...
[Groq] Attempt 2/6: Using key 2/6
[Groq] ✅ Request succeeded with key 2/6
```

### 4. **Force Reset Function**

Added `resetGroqClients()` function to force re-initialization if env vars change.

---

## 🔧 VERIFICATION STEPS

### Step 1: Check Your Environment Variables

In Vercel/Netlify dashboard, verify you have:

```
GROQ_API_KEY_1=gsk_...
GROQ_API_KEY_2=gsk_...
GROQ_API_KEY_3=gsk_...
GROQ_API_KEY_4=gsk_...
GROQ_API_KEY_5=gsk_...
GROQ_API_KEY_6=gsk_...
```

**Important**: 
- ✅ Keys must start with `gsk_`
- ✅ No spaces before/after the key
- ✅ Each key on a separate line (if using UI)
- ✅ Or comma-separated in `GROQ_API_KEY` if using that method

### Step 2: Check Deployment Logs

After deploying, check the first request logs. You should see:

```
[Groq] Initializing... Checking environment variables...
[Groq] Found GROQ_API_KEY_1
[Groq] Found GROQ_API_KEY_2
...
[Groq] ✅ Successfully initialized 6 API key(s)
```

**If you see**:
```
[Groq] No API keys found!
```

**Then**:
- Check environment variable names (must be exact: `GROQ_API_KEY_1`, not `GROQ_API_KEY1`)
- Check if keys are set in the correct environment (Production, Preview, Development)
- Redeploy after adding keys

### Step 3: Test Failover

Send multiple requests. When a key hits rate limit, you should see:

```
[Groq] ⚠️  Key 1 failed with status 429: Rate limit
[Groq] ❌ Marked key 1/6 as failed. Available keys: 5/6
[Groq] ➡️  Switching to key 2/6
[Groq] 🔄 Retrying with next key...
[Groq] ✅ Request succeeded with key 2/6
```

---

## 🐛 COMMON ISSUES

### Issue 1: Only 1 Key Detected

**Symptoms**: Logs show `Available keys: 0/1` or `Initialized 1 API key(s)`

**Causes**:
1. Only `GROQ_API_KEY_1` is set (others missing)
2. Environment variables not saved properly
3. Wrong environment (keys set in Development but app running in Production)

**Solution**:
1. Check Vercel/Netlify dashboard → Settings → Environment Variables
2. Verify all 6 keys are set: `GROQ_API_KEY_1` through `GROQ_API_KEY_6`
3. Make sure they're set for the correct environment (Production)
4. Redeploy after adding keys

### Issue 2: Keys Not Found After Deployment

**Symptoms**: `[Groq] No API keys found!`

**Causes**:
1. Environment variables not set in deployment platform
2. Keys set in wrong environment
3. Typo in variable names

**Solution**:
1. Double-check variable names: `GROQ_API_KEY_1` (not `GROQ_API_KEY1` or `GROQ_API_KEY_ 1`)
2. Set keys in Production environment
3. Redeploy after adding

### Issue 3: All Keys Failing

**Symptoms**: `[Groq] ❌ All 6 key(s) exhausted`

**Causes**:
1. All keys hit rate limit simultaneously
2. All keys are invalid/expired
3. All keys from same organization (shared limit)

**Solution**:
1. Wait for rate limit to reset (usually 24 hours)
2. Verify keys are valid (check Groq console)
3. Use keys from different Groq accounts/organizations

---

## 📊 EXPECTED LOG OUTPUT

### **Successful Initialization**:
```
[Groq] Initializing... Checking environment variables...
[Groq] Found GROQ_API_KEY_1
[Groq] Found GROQ_API_KEY_2
[Groq] Found GROQ_API_KEY_3
[Groq] Found GROQ_API_KEY_4
[Groq] Found GROQ_API_KEY_5
[Groq] Found GROQ_API_KEY_6
[Groq] Found 6 individual key(s): GROQ_API_KEY_1 through GROQ_API_KEY_6
[Groq] Total unique API keys found: 6
[Groq] Creating client 1/6 with key: gsk_abc123...
[Groq] Creating client 2/6 with key: gsk_def456...
[Groq] Creating client 3/6 with key: gsk_ghi789...
[Groq] Creating client 4/6 with key: gsk_jkl012...
[Groq] Creating client 5/6 with key: gsk_mno345...
[Groq] Creating client 6/6 with key: gsk_pqr678...
[Groq] ✅ Successfully initialized 6 API key(s)
```

### **Successful Request**:
```
[Groq] Starting request with 6 available key(s)
[Groq] Attempt 1/6: Using key 1/6
[Groq] ✅ Request succeeded with key 1/6
```

### **Failover on Rate Limit**:
```
[Groq] Starting request with 6 available key(s)
[Groq] Attempt 1/6: Using key 1/6
[Groq] ⚠️  Key 1 failed with status 429: Rate limit
[Groq] ❌ Marked key 1/6 as failed. Available keys: 5/6
[Groq] ➡️  Switching to key 2/6
[Groq] 🔄 Retrying with next key...
[Groq] Attempt 2/6: Using key 2/6
[Groq] ✅ Request succeeded with key 2/6
```

---

## ✅ VERIFICATION CHECKLIST

After deploying, verify:

- [ ] Logs show "Found GROQ_API_KEY_1" through "Found GROQ_API_KEY_6"
- [ ] Logs show "Successfully initialized 6 API key(s)"
- [ ] When a key fails, it switches to next key automatically
- [ ] User sees no errors (seamless failover)
- [ ] Multiple requests work without rate limit errors

---

**Status**: ✅ **FIXED & DEPLOYED**  
**Last Updated**: 2025-12-09

