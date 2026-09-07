# Phase 2 Grateful patch

From the repository root:

```bash
python3 phase-02-patch/apply_phase_02.py
npm run build
npm run dev
```

Then run `supabase/phase-02-grateful.sql` once in Supabase SQL Editor. Cross-device database and Realtime behavior requires a signed-in Supabase user. Without a session, the page remains testable using local persistence.
