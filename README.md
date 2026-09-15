# FitLife v2 Full Preview

A complete, locally testable frontend preview covering Snapshot, My Life, Health Metrics, Exercises, Sports, Habits, Fasting, Log History, Grateful and Settings.

## Run

```bash
npm install
npm run build
npm run dev
```

Open port 5173. The preview uses localStorage so the full interface remains testable without Supabase. `supabase/schema.sql` contains the cloud persistence foundation.

## Included

- Working navigation across every tab
- Six themes
- Three 3x3 bivariate matrices
- Now/7D/30D trajectory display and 90-day month-labelled history
- Compact health charts
- Habit, fasting, sports, gratitude, routine-player and metric recording flows
- Sports and gratitude image previews
- Profile avatar upload preview
- London-aware greeting and live clock
- Responsive phone, tablet and desktop layouts

## Security

Copy `.env.example` to `.env.local` only when connecting Supabase. Never commit `.env.local` or a service-role key.
