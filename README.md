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
3. **SQL Editor**: run `supabase/migrations/0001_saves.sql`, then `0002_unilag_students_only.sql`.
4. **Authentication → Emails → Templates**: in both **Magic Link** and **Confirm signup**, show the code — e.g. `<h2>Your UnilagLife gate code: {{ .Token }}</h2>` — so students receive a 6-digit code instead of only a link.
5. **Custom SMTP (required for real students)**: Supabase's built-in mailer only delivers to your own team's addresses and is heavily rate-limited. Under **Authentication → Emails → SMTP Settings**, connect a provider such as Resend or Brevo sending from your own domain (e.g. `gate@unilaglife.app`), with SPF/DKIM set up so school Outlook inboxes don't junk it. Then raise the email rate limit under **Authentication → Rate Limits**.
6. **Authentication → URL Configuration**: Site URL `http://localhost:3000` (later `https://unilaglife.app`).

## Testing without student email

- **Visitor pass** — with `NEXT_PUBLIC_VISITOR_PASS=true` in `.env.local` and Supabase → Authentication → Sign In / Providers → *Allow anonymous sign-ins* on, the gate shows a "Visitor pass · testing only" button. Turn both off in production.
- **Seeded students** — `npm run bots` (or `npm run bots -- 20`) puts simulated students on campus over Supabase Realtime: they walk real paths, sit to read or eat, gist in chat and answer greetings. Ctrl+C sends them home.

## Multiplayer

Everyone on campus shares one Supabase Realtime channel: presence for who's online and where they're resting, broadcasts for walking paths, activities and chat. The top bar shows how many students are on campus; 💬 in the dock opens campus chat, and messages float over the sender's head.

## Phase 1 (this build)

- **World** — stylised isometric Akoka: Main Gate, Senate Building, Main Library, Lecture Theatres, Mama B's Buka, Hall of Residence, Lagoon Front (promenade + jetty), Sports Centre, the roundabout clock tower, Third Mainland Bridge and the mainland skyline across the lagoon, Akoka town outside the fence.
- **Life sim** — five needs (energy, food, fun, social, hygiene), four skills, moodlets, a game clock with day/night lighting, weekly allowance from home, opening hours.
- **Degree loop** — acceptance fee → matriculation → 3 classes per semester → exam (prep, attendance, skills and mood set the grade) → school fees each level → convocation with a real Nigerian degree class (First, 2:1, 2:2, Third, Pass).
- **Campus life** — click-to-walk with A* pathfinding, NPC students who go home at night, the yellow campus shuttle, side hustles (typing assignments, washing plates).

## Layout

| Path | What lives there |
| --- | --- |
| `src/game/data.ts` | Campus map, departments, economy and academic constants — tune balance here |
| `src/game/actions.ts` | Every action a player can take, its costs, effects and gates |
| `src/game/store.ts` | Zustand store: clock, needs decay, action lifecycle, persistence |
| `src/game/nav.ts` | Walkable grid + A* pathfinding |
| `src/scene/` | React Three Fiber scene: terrain, buildings, avatars, lighting |
| `src/game/intro.ts` | The gate intro: walk-up, check-in, admission letter, walk-in |
| `src/game/auth.ts`, `src/game/cloud.ts` | Supabase auth helpers and cloud save/autosave |
| `src/ui/` | HUD, gate check-in register, admission letter, world labels |

## Next phases

- **Phase 2** — all 12 faculties as separate buildings (~24 departments), the real halls (Jaja, Moremi, Kofo Ademola, Mariere, Eni Njoku, Biobaku, Fagunwa, Honours, El-Kanemi, Amina, New Hall) with hall rivalry, SUG elections with manifestos and posters, CGPA-driven jobs board, accounts + multiplayer presence.
- **Phase 3** — sponsor noticeboards and buka menus, hall merch, seasonal events (Akoka Carnival, faculty week, ASUU-strike storylines).
