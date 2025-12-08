# Test Queries - Before Push Checklist

## LOGGED-OUT USER TESTS

### Test 1: General Question (Bangla)
**Query:** "Pregnant mohila ki long journey korte parbe?"
**Expected:** General answer about pregnancy travel safety (2-3 seconds)
**Status:** [ ]

### Test 2: Personal Medical Question (Banglish)
**Query:** "Amar ki alargy oshudh khaua dorkar?"
**Expected:** Redirect message OR follow-up question (instant)
**Status:** [ ]

### Test 3: General Question (English)
**Query:** "How pregnancy women be safe?"
**Expected:** General safety tips (2-3 seconds)
**Status:** [ ]

### Test 4: Greeting (English)
**Query:** "Hello"
**Expected:** Greeting response (instant <50ms)
**Status:** [ ]

### Test 5: Medical Info (English)
**Query:** "Which step required for pregnancy test?"
**Expected:** General answer about pregnancy tests (2-3 seconds)
**Status:** [ ]

## LOGGED-IN USER TESTS

### Test 6: Personal Medical (Banglish)
**Query:** "Amar ki alargy oshudh khaua dorkar?"
**Expected:** "কি ধরনের অ্যালার্জি? (খাবার/ত্বক/ধুলো?)" (instant)
**Status:** [ ]

### Test 7: General Question (Bangla)
**Query:** "Pregnant mohila ki long journey korte parbe?"
**Expected:** General answer (2-3 seconds, NO prescriptions)
**Status:** [ ]

### Test 8: Profile Info (Banglish)
**Query:** "Amar pregnancy er kotodin cholche?"
**Expected:** "আপনার গর্ভাবস্থা ৯ সপ্তাহে চলছে।" (1-2 seconds, NO prescriptions)
**Status:** [ ]

### Test 9: Ask for Question
**Query:** "Amake ekta proshno koro"
**Expected:** "আপনার গর্ভাবস্থার কোন বিষয়ে আমি আপনাকে সাহায্য করতে পারি?" (instant)
**Status:** [ ]

## FORMATTING CHECKS

### Check 1: Question Marks
- [ ] All questions end with single "?"
- [ ] No double "??"
- [ ] No "? ।" or ". ?"
- [ ] Punctuation is clean

### Check 2: Prescriptions
- [ ] General questions: NO prescription details
- [ ] Profile questions: NO prescription lists (unless asked)
- [ ] Only show prescriptions when explicitly requested

## PERFORMANCE CHECKS

### Speed Requirements:
- [ ] Greetings: <100ms
- [ ] Simple follow-ups: <100ms
- [ ] Profile queries (logged-in): <2 seconds
- [ ] General queries: <4 seconds
- [ ] No timeouts or crashes

## PASS CRITERIA

All tests must PASS before pushing to production.

If ANY test fails, DO NOT push.

