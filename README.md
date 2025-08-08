# Attendance System (GitHub Pages + Supabase)

Free, serverless attendance system with:
- Email/password **sign up / login**
- **5-question quiz** captcha
- **Exactly 2 attempts per day**
- Attendance marked only if **all 5 correct**

**Stack:** Static site on GitHub Pages + Supabase (Auth, Postgres, Row-Level Security, RPC).

## 1) Supabase setup (10–15 min)
1. Create a project at https://app.supabase.com (Free tier).
2. In **Authentication → Providers**, enable **Email**.
3. In **Authentication → URL Configuration**, add your GitHub Pages URL (e.g., `https://username.github.io/attendance/`) to redirect URLs.
4. Open **SQL Editor**, paste `supabase.sql`, and run it.
5. (Optional) In **Authentication → Policies**, keep email confirmation off to simplify testing.

## 2) Add questions
- After running the SQL, go to **Table Editor → public.questions** and add your questions (text + options array).
- Then in **private.answers**, add the `correct_index` (0 = first option). The sample seed in `supabase.sql` shows how.

## 3) Frontend config
- Open `app.js` and replace:
  - `SUPABASE_URL` with your Project URL
  - `SUPABASE_ANON_KEY` with your anon key
- Commit/push to GitHub and enable **GitHub Pages** (Settings → Pages → select branch).

## 4) Use
- Visit your Pages URL.
- **Sign up** and **login**.
- Click **Submit** after answering all 5 questions.
- You have **2 attempts/day**. On success, your attendance is recorded.

## How limits are enforced
- A Postgres RPC `mark_attendance()` runs with **SECURITY DEFINER**. It reads hidden answers from the `private.answers` table and updates `attempts` + `attendance` atomically.
- **RLS** ensures users can only read their own attempts/attendance. Clients cannot write to those tables directly.

## Notes
- Timezone is set to **Asia/Karachi** inside the function.
- You can style and brand the UI in `styles.css`.
- To add more quiz questions, just insert more rows in `public.questions` and their answers in `private.answers`.

## Troubleshooting
- Make sure your GitHub Pages domain is in Supabase Auth **Redirect URLs**.
- If you see RLS errors, re-run the SQL and ensure policies exist.
- Use your browser console to see RPC error messages.
