# Automatic Recommendations Cron Job Setup

The automatic recommendation system sends personalized recommendations to all mothers at 8 AM and 8 PM in their local timezone, regardless of whether they are logged in.

## How It Works

The cron job endpoint `/api/cron/generate-recommendations` runs every 5 minutes and:
1. Checks all active mothers
2. Determines their local timezone
3. Checks if it's 8:00-8:05 AM or 8:00-8:05 PM in their timezone
4. Generates and sends personalized recommendations if it's the right time
5. Avoids sending duplicate recommendations on the same day

## Setup Instructions

### Option 1: Vercel (Recommended)

If you're deploying on Vercel, the cron job is already configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/generate-recommendations",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

The cron job will automatically run every 5 minutes once deployed to Vercel.

### Option 2: Other Platforms

If you're using a different hosting platform, you can set up an external cron job service:

#### Using EasyCron, Cron-job.org, or similar:
1. Create an account on a cron service
2. Add a new cron job with:
   - **URL**: `https://your-domain.com/api/cron/generate-recommendations`
   - **Schedule**: Every 5 minutes (`*/5 * * * *`)
   - **Method**: GET

#### Using a server-side cron job:
Add to your server's crontab:
```bash
*/5 * * * * curl -X GET https://your-domain.com/api/cron/generate-recommendations
```

#### Using GitHub Actions (for testing):
Create `.github/workflows/cron-recommendations.yml`:
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
          curl -X GET https://your-domain.com/api/cron/generate-recommendations
```

## Testing

You can manually test the endpoint by calling:
```bash
curl https://your-domain.com/api/cron/generate-recommendations
```

Or visit the URL in your browser when deployed.

## Monitoring

The endpoint returns a JSON response with:
- `success`: Boolean indicating if the job completed
- `timestamp`: When the job ran
- `results`: Object with:
  - `processed`: Number of mothers processed
  - `sent`: Number of recommendations sent
  - `skipped`: Number of mothers skipped (not the right time, already sent, etc.)
  - `errors`: Array of any errors encountered

## Notes

- The cron job runs every 5 minutes to catch the 5-minute window (8:00-8:05 AM/PM)
- Recommendations are only sent once per day per time slot (morning/evening)
- Paused mothers are automatically skipped
- The system uses each mother's stored timezone or detects it from their address

