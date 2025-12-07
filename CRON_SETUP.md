# Automatic Cron Job Setup

The cron job system automatically handles two important tasks for all mothers:
1. **Recommendations**: Sends personalized recommendations at 8 AM and 8 PM in their local timezone
2. **Pregnancy Day Updates**: Auto-increments pregnancy days at 12:00 AM (midnight) in their local timezone

Both tasks work regardless of whether mothers are logged in or not.

## How It Works

The cron job endpoint `/api/cron/generate-recommendations` runs every 5 minutes and:

### Recommendations (8 AM & 8 PM):
1. Checks all active mothers
2. Determines their local timezone
3. Checks if it's 8:00-8:05 AM or 8:00-8:05 PM in their timezone
4. Generates and sends personalized recommendations if it's the right time
5. Avoids sending duplicate recommendations on the same day

### Pregnancy Day Updates (Midnight):
1. Checks all active mothers
2. Determines their local timezone
3. Checks if it's 12:00-12:05 AM (midnight) in their timezone
4. Auto-increments pregnancy days by 1 if it's a new day
5. Updates the mother's profile with the new pregnancy day count
6. Avoids updating multiple times on the same day

## Setup Instructions for Netlify

Since Netlify doesn't have built-in cron jobs, you need to use an external cron service to call the endpoint. Here are the best options:

### Option 1: EasyCron (Recommended - Free tier available)

1. **Sign up** at [EasyCron.com](https://www.easycron.com/) (free account available)
2. **Create a new cron job**:
   - **URL**: `https://your-netlify-site.netlify.app/api/cron/generate-recommendations`
   - **Schedule**: Every 5 minutes (`*/5 * * * *`)
   - **HTTP Method**: GET
   - **Status**: Active
3. **Save** the cron job

### Option 2: Cron-job.org (Free)

1. **Sign up** at [Cron-job.org](https://cron-job.org/) (free account available)
2. **Create a new cron job**:
   - **Title**: MomsCare Recommendations
   - **URL**: `https://your-netlify-site.netlify.app/api/cron/generate-recommendations`
   - **Schedule**: Every 5 minutes
   - **Request Method**: GET
3. **Save** and activate the cron job

### Option 3: GitHub Actions (Free for public repos)

If your repository is on GitHub, you can use GitHub Actions. Create `.github/workflows/cron-recommendations.yml`:
```yaml
name: Generate Recommendations
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
  workflow_dispatch:  # Allow manual trigger

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - name: Call API
        run: |
          curl -X GET https://your-netlify-site.netlify.app/api/cron/generate-recommendations
```

### Option 4: Other External Cron Services

You can use any external cron service that can make HTTP requests. Popular options include:
- **UptimeRobot** (free tier: 50 monitors)
- **Cronitor** (free tier available)
- **Healthchecks.io** (free tier available)

Just configure them to call your endpoint every 5 minutes using GET method.

## Testing

You can manually test the endpoint by calling:
```bash
curl https://your-netlify-site.netlify.app/api/cron/generate-recommendations
```

Or visit the URL in your browser when deployed. Replace `your-netlify-site` with your actual Netlify site name.

## Monitoring

The endpoint returns a JSON response with:
- `success`: Boolean indicating if the job completed
- `timestamp`: When the job ran
- `results`: Object with:
  - `processed`: Number of mothers processed
  - `recommendations`: Object with:
    - `sent`: Number of recommendations sent
    - `skipped`: Number of mothers skipped (not the right time, already sent, etc.)
  - `pregnancyUpdates`: Object with:
    - `updated`: Number of pregnancy days updated
    - `skipped`: Number of mothers skipped (not midnight, already updated, etc.)
  - `errors`: Array of any errors encountered

## Notes

- The cron job runs every 5 minutes to catch the 5-minute windows:
  - **Recommendations**: 8:00-8:05 AM and 8:00-8:05 PM
  - **Pregnancy Updates**: 12:00-12:05 AM (midnight)
- Recommendations are only sent once per day per time slot (morning/evening)
- Pregnancy days are only updated once per day at midnight
- Paused mothers are automatically skipped
- The system uses each mother's stored timezone or detects it from their address
- Both tasks work independently - a mother can receive recommendations and have their pregnancy day updated in the same cron run if the times align

