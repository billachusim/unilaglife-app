# UnilagLife

A live campus life sim set in the University of Lagos, Akoka. Matriculate, attend lectures, survive exams, graduate.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. Without Supabase keys the game runs guest-only (progress in `localStorage`). "Start a new student" in the profile panel resets it.

## Accounts — verified UNILAG students only

New players meet the gateman at the Main Gate and show their ID: they enter their **matric number**, a 6-digit code goes to their **UNILAG student mailbox** (`matric@live.unilag.edu.ng`), and they read it back. The same flow signs up freshers and signs in returning students. Sessions persist on the device, so returning players skip the gate; saves sync to Supabase every 15s and whenever the tab is hidden.

The student email domain lives in `STUDENT_EMAIL_DOMAIN` (`src/game/auth.ts`) and in `supabase/migrations/0002_unilag_students_only.sql` — change both if the format differs.

1. Create a project at [supabase.com](https://supabase.com).
2. **Project Settings → API**: copy the Project URL and the publishable key into `.env.local` (see `.env.local.example`), then restart `npm run dev`.
3. **SQL Editor**: run `supabase/migrations/0001_saves.sql`, `0002_unilag_students_only.sql`, then `0003_campus.sql` (profiles, Hall Cup, SUG elections, sponsor slots).
4. **Authentication → Emails → Templates**: in both **Magic Link** and **Confirm signup**, show the code — e.g. `<h2>Your UnilagLife gate code: {{ .Token }}</h2>` — so students receive a 6-digit code instead of only a link.
5. **Custom SMTP (required for real students)**: Supabase's built-in mailer only delivers to your own team's addresses and is heavily rate-limited. Under **Authentication → Emails → SMTP Settings**, connect a provider such as Resend or Brevo sending from your own domain (e.g. `gate@unilaglife.app`), with SPF/DKIM set up so school Outlook inboxes don't junk it. Then raise the email rate limit under **Authentication → Rate Limits**.
6. **Authentication → URL Configuration**: Site URL `http://localhost:3000` (later `https://unilaglife.app`).

## Testing without student email

- **Visitor pass** — with `NEXT_PUBLIC_VISITOR_PASS=true` in `.env.local` and Supabase → Authentication → Sign In / Providers → *Allow anonymous sign-ins* on, the gate shows a "Visitor pass · testing only" button. Turn both off in production.
- **Seeded students** — `npm run bots` (or `npm run bots -- 20`) puts simulated students on campus over Supabase Realtime: they walk real paths, sit to read or eat, gist in chat and answer greetings. Ctrl+C sends them home.

## Multiplayer

Everyone on campus shares one Supabase Realtime channel: presence for who's online and where they're resting, broadcasts for walking paths, activities and chat. The top bar shows how many students are on campus; 💬 in the dock opens campus chat, and messages float over the sender's head.

## What's in the game

- **World** — stylised isometric Akoka: Main Gate, Senate Building, Main Library, Lecture Theatres (GST), Mama B's Buka, Lagoon Front with jetty, Sports Centre, Student Union Building, a **Halls quarter** (Jaja, Mariere, Eni Njoku, El-Kanemi, Moremi, Kofo Ademola, Madam Tinubu, Queen Amina) and a **Faculty Quad** with all 12 faculties; Third Mainland Bridge and the mainland skyline across the lagoon.
- **Degree loop** — 23 real departments across 12 faculties (4–6 year degrees). Acceptance fee → matriculation → lectures at *your* faculty (GST counts too) → exams → school fees → convocation with a real degree class. ASUU strikes can suspend a semester.
- **Halls** — allocated on the admission letter (male and female halls); sleep, bathe and gist at your own hall, visit friends at others (4 – 10 PM). Hall jerseys at the SUB.
- **Hall Cup & Dean's List** — exams, football, Faculty Week, the Akoka Carnival and Sunday Inter-Hall Games earn points for your hall (server-side, rate-limited). Top CGPAs make the Dean's List.
- **SUG elections** — a new term every real week: declare with a manifesto and a campus policy, vote once per term (changeable), see results by faculty. Last term's winner is President and their policy applies to everyone (steady light, cheaper buka, faster shuttles, reading rooms, Friday jams).
- **Careers board** — SIWES and campus roles for students; 13 graduate roles gated by course and degree class, with a First earning 20% more per shift.
- **Campus calendar** — Faculty Week, Akoka Carnival and Inter-Hall Games rotate by game week.
- **Sponsors** — six billboards and a buka-menu slot. Empty slots invite brands to advertise.

## Sponsors

Add rows to `sponsor_slots` in the Supabase Table Editor. Use ids `billboard-1` … `billboard-6` (placement `billboard`) or any id with placement `buka`; `image_url` should be a public image (e.g. a public Supabase Storage bucket, 15:8); the slot shows between `starts_at` and `ends_at`. Advertising enquiries go to `ADVERTISE_CONTACT` in `src/ui/CampusPanels.tsx`.

## Layout

| Path | What lives there |
| --- | --- |
| `src/game/data.ts` | Campus map, departments, economy and academic constants — tune balance here |
| `src/game/actions.ts` | Every action a player can take, its costs, effects and gates |
| `src/game/store.ts` | Zustand store: clock, needs decay, action lifecycle, persistence |
| `src/game/nav.ts` | Walkable grid + A* pathfinding |
| `src/scene/` | React Three Fiber scene: terrain, buildings, avatars, lighting |
| `src/game/intro.ts` | The gate intro: walk-up, check-in, admission letter, walk-in |
| `src/game/campus.ts` | Shared campus state: profiles, Hall Cup, Dean's List, SUG elections, sponsors |
| `src/game/jobs.ts`, `policy.ts`, `events.ts` | Careers board, SUG policies, campus calendar |
| `src/game/online.ts` | Realtime presence, movement and chat |
| `src/game/auth.ts`, `src/game/cloud.ts` | Supabase auth helpers and cloud save/autosave |
| `src/ui/` | HUD, gate check-in register, admission letter, world labels |

## Next

- Real-money payments for sponsor slots and merch (Paystack), an advertiser self-serve page.
- Off-campus Yaba, and the College of Medicine at Idi-Araba as its own map.
- Moderation for campus chat (reporting, filters) before a public launch.
