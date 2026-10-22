# Tennis Tuesdays Cup 2026 · scoring app

Tournament-day admin for the **Tennis Tuesdays Cup 2026** (Saturday 31 October, Eildon Park Tennis Club): who's on which court, scores, the ladder, the finals and the presentation.

**Live app:** https://shlokthakur1.github.io/ttc-scoring-app/

The format, draw, rules and timetable are built in, taken from the tournament program: 11 players, 3 courts, a 19-round round robin (race to 7), the Final Four (race to 11), the Third Place Playoff and The Final.

## On the day

1. Open the app on the scoring laptop and press **Start tournament** at 10:00.
2. When a winner reports their score, click **Enter score** on their court, pick the winner and tap the score (e.g. `7–5`). A mistake can be undone from the pop-up, or fixed later with **Edit**.
3. When the last score of a round goes in, the next round starts automatically, as the rules require. Press **📣 Call players** to read the court list aloud.
4. Open **📺 TV display** in a second window and drag it onto a TV or projector. It updates live.
5. After round 19 the top 4 are seeded into the Final Four automatically. Press **Start Final Four** after the break.
6. The **Awards** page has the podium and fun awards for the presentation (use Full screen).

### What's in it

| Page | What it's for |
| --- | --- |
| **Courts** | The current round: each court's players (Home player marked **H**: they choose feed or receive), the line judge, score entry, who's resting, who's up next (with back-to-back warnings), a round timer, and whether you're ahead of or behind the timetable (projected round robin finish and presentation time, with a warning if you'll run past the 1:30 PM court deadline). |
| **Ladder** | Round robin standings using the official order (match wins → point differential → head-to-head → points won), the Final Four cut line, which tiebreaker separated players, form, players mathematically through (**Q**) or **out**, each player's next match, and a full head-to-head grid. Copy it for the group chat in one click. |
| **Fixtures** | All 63 matches with courts, scores and line judges; filter by player; **Print** for a paper backup. |
| **Players** | A card per player: playing, judging or resting right now, next match and how many rounds away, next line-judge duty, results. Handy for "when am I on?" |
| **Finals** | Final Four seeding (Q1–Q4), the fresh Final Four table, the 3rd place playoff and The Final. Seeding can be set by hand for an unbreakable tie (coin toss) or a withdrawal, and is locked once the next stage starts so a late correction can't swap players mid-stage. |
| **Awards** | Podium plus awards such as Round Robin Winner, Best Point Differential, Most Points Won, Biggest Win, Bagel Baker, Match of the Day, Longest Win Streak and Brick Wall. |
| **Rules** | The rules and the day's timetable, for settling disputes. |
| **Admin** | Backup export/import (JSON), results spreadsheet (CSV), offline copy, player renames, rehearsal mode, reset (with a restore point), and an activity log of every score and correction. |

**Line judges.** The rules ask for one resting player per court as a second opinion. The app assigns them automatically and evenly: exactly 5 duties each across the round robin, then eliminated players for the finals. Any assignment can be changed from the drop-down on the court card.

**Score checks.** Quick-pick buttons only offer valid "first to N, win by 2" scores. A custom score that breaks the rule (e.g. 7–6) asks for confirmation, for when a match had to be cut short. Walkovers are recorded as N–0 and marked **W/O**.

## Practise first: rehearsal mode

Admin → **Open rehearsal in a new tab** runs a separate copy with its own data, so the real tournament isn't touched. Use **Simulate next round** / **Finish everything** to fill in made-up scores and walk through the whole day, including the finals and presentation. Add `?rehearsal=12` to the URL to start with 12 rounds already played.

## Where the data lives

Scores are saved automatically in the browser on the laptop you use (`localStorage`), so the app works with no internet once it has loaded. A few things to know:

- Use **one laptop and one browser** for scoring. Other tabs on the same laptop (like the TV display) stay in sync.
- The public link on someone's phone shows an **empty** tournament: the scores aren't uploaded anywhere. Share the ladder with **Copy for group chat** instead.
- **Export a backup** at the break. It can be imported on any other device to carry on.
- For a fully offline setup, Admin → **Download the app** saves a single `.html` file that opens by double-click.

## Development

```bash
npm install
npm run dev      # local dev server
npm test         # unit tests: fixture integrity, scoring, tiebreakers, seeding, rotas, schedule
npm run build    # type-check and build dist/index.html (single self-contained file)
```

Built with React + TypeScript + Vite. Pushing to `main` runs the tests and deploys to GitHub Pages (`.github/workflows/deploy.yml`).

Key files: the draw in [`src/data/fixture.ts`](src/data/fixture.ts), standings and tiebreakers in [`src/lib/standings.ts`](src/lib/standings.ts), stage progression, seeding and line judges in [`src/lib/tournament.ts`](src/lib/tournament.ts), and every state change (with the activity log) in [`src/lib/reducer.ts`](src/lib/reducer.ts).
