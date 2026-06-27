# SYNAPSE — Demo Video Storyboard

**Team:** Segfault Society | **Event:** CIPHER 2.0 | **Target runtime:** 3–4 minutes

Record at 1080p. Brisk, narrated walkthrough — one idea per screen. The engine does the talking.

> **All numbers below are the real values the engine produces against the seeded data** (verified). Scores assume you pick a slot within the next ~48 h (urgency caps at 1.0 for slots ≤ 48 h out). If you pick a slot further out, the urgency component — and the totals — drop slightly, but the *ordering* of winners stays the same.

---

## Before you hit record

1. **`supabase db reset`** — clean seed state (0 bookings; Lab-A free; fairness drift: Tariq over-served, Ana under-served).
2. **`pnpm dev`**, then open **http://localhost:3000** in Chrome; zoom to ~110 % for legibility.
3. (Optional) Open Supabase Studio (**http://127.0.0.1:54323**) in a second tab to cut to the `audit_log` table.
4. **Set the persona to `Mihir Jain — student`** using the dropdown in the top-right of the header before recording. (The header also has nav links: Home · Me · Admin · Demo.)

**Slot picker legend (important):** slots are **1-hour**. **White** = free (click to select). **Amber** = already booked — *still clickable*; selecting it submits a **competing request** the engine will arbitrate. Past slots are not shown.

---

## Shot 1 — Discovery & Resource Grid (0:00–0:30)

**Persona:** Mihir Jain (year-1 student)

**Show:**
- The **SYNAPSE** header; persona switcher reads "Mihir Jain — student" with a "Student" badge.
- The resource grid on `/` — 8 cards: Lab-A, Lab-B, Meeting Room 1 & 2, AV Studio, VR Kit, Oscilloscope Bench, 3D Printer.
- Use the **class filter** → choose **Computer Lab** → grid narrows to Lab-A and Lab-B.
- Note Lab-A's card: Block A, 30 seats, equipment chips (dual-monitor, GPU).

**Narration:**
> "SYNAPSE gives the whole campus a live view of shared resources. I'm Mihir, a first-year student. I can filter by type, building, or capacity — let me narrow to computer labs and open Lab-A."

---

## Shot 2 — Mihir Books a Free Slot (0:30–1:05)

**Persona:** Mihir Jain

**Show:**
- Click Lab-A → `/resources/[id]`. Header shows "Computer Lab · Block A · 30 seats".
- In **Book a slot**, pick any **white (free)** 1-hour slot a day or two out — e.g. **Tue 14:00**. It turns cyan; a "Selected: …" line appears.
- Type **`casual study`** in **Purpose (optional)**.
- Click **Request booking**.
- The **Decision** modal opens: heading **✓ Confirmed**. Under "Allocated to", Mihir's score bars: Urgency (full), Role weight (low — year-1), Fairness deficit (he's been moderately under-served), Recency penalty (none), Academic purpose (0 — "casual study" doesn't match an academic keyword). Close it.

**Narration:**
> "Mihir picks Tuesday at 2 PM. The engine scores his request live — first-year, so a low role weight, and no academic-purpose match. The slot's free, so he's confirmed. Notice every score component is shown — nothing is a black box."

---

## Shot 3 — Sarah Contends the Same Slot & Wins by Priority (1:05–1:55) ⭐

**Persona:** Switch to **Sarah Fernando — student** (final-year, capstone)

**Show:**
- Open the persona dropdown → select **Sarah Fernando**. Header + badge update.
- Still on Lab-A. The **Tue 14:00** slot Mihir just booked is now **amber** (booked). **Click it anyway** — amber slots are contendable. It selects (cyan).
- Type **`capstone project`** in Purpose.
- Click **Request booking**.
- The **Decision** modal opens: heading **✓ Confirmed by priority**.
  - **Allocated to: Sarah** — total ≈ **0.73**. Bars: Role weight 0.80 (final-year), Fairness deficit ≈ 0.62 (under-served), Academic purpose 1.0 ("capstone" matches a computer-lab purpose).
  - **Contender: Mihir** — total ≈ **0.56**. Lower role weight (0.40), no academic-purpose match.
  - **Counterfactuals**: two alternatives are suggested (a later Lab-A slot and Lab-B) with their scores — so the displaced user isn't stranded.
- Close. (Mihir has been atomically demoted to the waitlist for that slot.)

**Narration:**
> "Now I'm Sarah — final-year, working on her capstone. She requests the *same* slot. The engine scores both: Sarah 0.73, Mihir 0.56. Sarah wins on role weight, fairness — she's been under-served — and a matching academic purpose. Mihir is automatically waitlisted, and the explainer even suggests two alternatives. Every decision is transparent and contestable."

---

## Shot 4 — N-way Contention on /demo: fairness can outrank seniority (1:55–2:35) ⭐

**Persona:** any (System Admin is fine)

> **⚠️ Reset before this shot.** The `/demo` winner is computed from the **live fairness ledger**. After the booking shots above, fairness has drifted — and in a drifted state Dr. Perera (faculty, pure role weight) can win. For the scripted "fairness beats seniority" beat, run **`supabase db reset`** first (and refresh the tab) so the fairness ledger is in its seeded state (Sarah's deficit ≈ 0.62). This shot is self-contained — it doesn't depend on the earlier bookings, so a clean reset here is fine (cut to it in editing).

**Show:**
- Go to **`/demo`** (the contention control room).
- Resource dropdown → **Lab-A**. Pick a slot (the defaults are fine).
- Member checklist: keep **Sarah, Mihir, and Dr. Perera** checked (Dr. Perera is faculty).
- Click **Fire simultaneous requests** (button shows "Simulating…").
- Results (on clean seed): **Winner — Sarah Fernando ≈ 0.68** (cyan card). Ranked contenders, **each shown with its name**: **#1 Mihir Jain ≈ 0.56**, **#2 Dr. Perera ≈ 0.55**.
- Re-fire a couple of times to show the winner never changes — order-independent.

> If you'd rather *not* reset, that's fine — just narrate whoever actually wins. The point of this shot is the **order-independent, transparent, multi-factor arbitration**; "fairness outranking faculty" is the bonus you get on the seeded state.

**Narration:**
> "The control room fires several requests at one slot simultaneously. Watch what happens: the faculty member, Dr. Perera, has the highest role weight — but he *loses*. Sarah, an under-served final-year student, wins because her fairness deficit tips the balance. Fairness is a first-class factor, not an afterthought — and the result is deterministic by score, not by who clicked first."

*(Note: the simulation scores raw role + fairness + urgency — it doesn't apply an academic-purpose bonus — which is why these totals differ slightly from Shot 3.)*

---

## Shot 5 — Admin Console: Fairness, Open Policy, Ops (2:35–3:20)

**Persona:** Switch to **System Admin** (or Nimal — Lab Manager)

**Show:**

**Fairness tab** (`/admin` → "Admin console"):
- The fairness dashboard, grouped by resource class. For **Computer Lab**: **Tariq (over-served)** — served hours far above fair share, fairness term ≈ **0.00**; **Ana (under-served)** — well below fair share, fairness term ≈ **0.81** (tall bar). Sarah/Mihir sit around 0.62.

**Policy tab** ("Open Policy"):
- Find **Fairness weight (γ)** (a **numeric input**, currently **0.30**). Change it to **0.40** → click **Save**. Toast: **`Saved "Fairness weight (γ)" → 0.4`**. Weights are data, not code — live for the next booking.

**Ops tab:**
- Click **Run rebalance** → toast **`Fairness rebalance complete`**; a JSON report card appears below (per-member fairness terms).
- Click **Run reaper** → toast **`No-show reaper complete`** with its JSON result.
- (Mention: in production these run on a `pg_cron` schedule; here they're button-triggered so you can show them live.)

**Narration:**
> "Lab managers get full visibility. The fairness dashboard shows who's monopolised resources — Tariq — and who's been squeezed out — Ana, fairness term 0.81. Weights are open policy: I raise the fairness weight live, and the next allocation reflects it immediately. Rebalance recomputes every member's fairness term over the window; the reaper releases no-shows and auto-promotes their waitlisted replacements."

---

## Shot 6 — Cancel → Smart-Waitlist Auto-Promote (3:20–3:50) ⭐

**Persona:** **Sarah Fernando** (who won the Tue 14:00 slot in Shot 3)

**Show:**
- Go to **`/me`**. Sarah has the confirmed **Lab-A Tue 14:00** booking.
- Click **Cancel** → AlertDialog "Cancel booking?" → confirm with **Cancel booking**.
- Toast: **`Booking cancelled`**. (The auto-promotion happens server-side inside the cancel RPC; its effect shows on the resource page / audit log, not in the toast.)
- Switch to **Mihir Jain** → `/me`. Mihir now holds a **confirmed** Lab-A Tue 14:00 booking — his waitlist entry was auto-promoted. (You can also open Lab-A to see it's his again, or Studio's `audit_log`.)

**Narration:**
> "When Sarah cancels, the engine instantly promotes the top-ranked waiter — Mihir — to a confirmed booking, atomically inside the cancel. No admin action, no re-submitting. That's the smart waitlist closing the loop."

---

## Closing (3:50–4:00)

- Return to `/` with the full grid visible.

**Narration:**
> "SYNAPSE — conflict-free by construction, transparent by design, fair by algorithm. Built for CIPHER 2.0 by Segfault Society."

---

## Recording tips

- Narrate live or voice-over in post.
- Use browser zoom so text is readable at 1080p.
- If a toast vanishes too fast, pause and re-trigger.
- Pick demo slots **within ~2 days** so the scores match the numbers above (urgency = 1.0).
- If anything gets into a messy state between takes, run **`supabase db reset`** to restore the clean canvas.
- Keep it under 5 minutes; 3:30–4:00 is the sweet spot.
