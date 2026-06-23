# SYNAPSE — Demo Video Storyboard

**Team:** Segfault Society | **Event:** CIPHER 2.0 | **Target runtime:** 3–4 minutes

Record at 1080p. Aim for a brisk, narrated walkthrough — one idea per screen. No fancy transitions needed; the engine does the talking.

---

## Before you hit record

1. Run `supabase db reset` to get a clean seed state.
2. Run `pnpm dev`.
3. Open [http://localhost:3000](http://localhost:3000) in Chrome, zoom to 110 % so text is legible.
4. Open Supabase Studio ([http://127.0.0.1:54323](http://127.0.0.1:54323)) in a second tab — you may want to cut to it briefly when showing database state.
5. The active persona at startup will be whoever was last persisted to localStorage. Set it to **Mihir Jain** before recording.

---

## Shot 1 — Discovery and Resource Grid (0:00–0:35)

**Persona:** Mihir Jain (year-1 student)

**What to show:**
- The SYNAPSE header with the persona switcher showing "Mihir Jain" in the top right.
- The resource grid on `/` — eight cards: Lab-A, Lab-B, two meeting rooms, AV Studio, VR Kit, Oscilloscope Bench, 3D Printer.
- Apply the **Computer Lab** filter. Grid narrows to Lab-A and Lab-B.
- Hover Lab-A to show capacity (30 seats, dual-monitor + GPU, Block A).

**Narration:**
> "SYNAPSE gives every university community member a live view of all shared resources. I'm logged in as Mihir, a first-year student. I can filter by type, building, or capacity. Let me narrow to computer labs and head into Lab-A."

---

## Shot 2 — Mihir Books Lab-A (0:35–1:10)

**Persona:** Mihir Jain

**What to show:**
- Click Lab-A to navigate to `/resources/[id]`.
- The slot picker: a week grid of 2-hour slots. Available slots are bright; booked slots are dimmed/disabled.
- Click any available slot (e.g. Tuesday 14:00–16:00).
- The booking form slides open. Type "lab session" in the Purpose field.
- Click **Request booking**.
- The Decision Modal opens. Heading reads **Booking Confirmed**. Score bars are visible: Urgency, Role weight (low — Mihir is a year-1 undergrad), Fairness deficit (near zero), Recency penalty, Academic purpose.
- Close the modal.

**Narration:**
> "I pick Tuesday 14:00 and submit. The engine scores my request instantly — I'm a first-year, so my role weight is low and I have no fairness history yet. The slot is free, so I'm confirmed. Notice the score breakdown: every component is transparent."

---

## Shot 3 — Sarah Conflicts and Wins by Priority (1:10–1:55)

**Persona:** Switch to **Sarah Fernando** (final-year, capstone project)

**What to show:**
- Open the persona switcher dropdown. Select "Sarah Fernando". The header updates.
- Stay on Lab-A (`/resources/[id]`) or navigate back to it.
- Click the **same Tuesday 14:00 slot** that Mihir just booked (it should now show as busy/Mihir's).
- Type "capstone project" in the Purpose field.
- Click **Request booking**.
- The Decision Modal opens. Heading reads **Booking Confirmed by Priority**.
- Show the winner card (Sarah, score ~0.73) and the contender card (Mihir, score ~0.31) side by side.
- Expand the score bars: Sarah's Role weight bar is taller (0.80 vs 0.40); her Fairness deficit bar is high (she was under-served); her Academic purpose bar is full (keyword "capstone" matched computer lab).
- Scroll to the Counterfactuals section: two alternate slots for Mihir are listed (e.g. "Lab-A Wed 10:00" and "Lab-B Tue 14:00") with their scores.
- Close the modal.

**Narration:**
> "Now I switch to Sarah — a final-year student working on her capstone thesis. She requests the same slot. The engine scores both parties: Sarah's combined score is 0.73; Mihir's is 0.31. Sarah wins on role weight AND fairness — she's been historically under-served. Mihir is automatically waitlisted at rank 1, and the explainer suggests two alternate slots he could book instead. No one is left in the dark."

---

## Shot 4 — N-way Contention Simulation on /demo (1:55–2:35)

**Persona:** Any (System Admin is fine)

**What to show:**
- Navigate to `/demo`.
- The contention control room: a resource selector and a member checklist.
- From the resource dropdown, select **Lab-A**.
- The member checkboxes load. Sarah, Mihir, and Dr. Perera are pre-checked.
- Click **Fire simultaneous requests**.
- The button shows a loading state for 1–2 seconds, then results appear.
- The Winner card shows **Dr. Perera** (faculty, score ~0.55+) with cyan background.
- Below: "All contenders (ranked)" — Sarah at #1, Mihir at #2, with their score bars.
- Point out that the result is order-independent: no matter how many times you fire, the same person wins.

**Narration:**
> "The demo control room lets us simulate N simultaneous requests. I fire Sarah, Mihir, and Dr. Perera at the same slot at once. The engine scores all three, picks the winner by priority — Dr. Perera, faculty, role weight 1.0 — and ranks the rest. Same result every time, regardless of who clicked first. This is the 'deterministic winner by priority, not arrival time' guarantee."

---

## Shot 5 — Admin Console: Fairness, Policy, and Ops (2:35–3:20)

**Persona:** Switch to **System Admin**

**What to show:**

**Fairness tab (default):**
- Navigate to `/admin`. "Admin console" heading confirms access.
- The Fairness Dashboard table. Point out **Tariq (over-served)**: served hours are well above fair share, fairness term ≈ 0. Point out **Ana (under-served)**: served hours below fair share, fairness term close to 1.0 (bright bar).

**Policy tab:**
- Click the **Policy** tab.
- Slide the γ (Fairness weight) slider from 0.30 to 0.40. Click **Save**.
- A success toast confirms the change. The new weight is live for all subsequent bookings.

**Ops tab:**
- Click the **Ops** tab.
- Click **Run rebalance**. Toast: "Rebalance complete — N members updated."
- Click **Run reaper**. Toast: "Reaper complete — N no-shows released, M promoted."
- Briefly note: in production these would run on a `pg_cron` schedule; for the demo they are manual.

**Narration:**
> "The admin console gives lab managers full visibility. The Fairness tab shows who's over-served and who's been squeezed out — Tariq has used 16 hours of Lab-A in 30 days; Ana has had 1. I can tune the fairness weight live — raising γ means Ana's next request will score significantly higher. Running the rebalance recalculates everyone's fairness term; running the reaper marks unchecked-in sessions as no-shows and auto-promotes their waitlisted replacements."

---

## Shot 6 — Cancel a Booking and Watch Auto-Promote (3:20–3:50)

**Persona:** Switch back to **Mihir Jain** (who was waitlisted in Shot 3)

**What to show:**
- Navigate to `/me` (My Bookings).
- Mihir's waitlist entry for Lab-A Tuesday 14:00 is visible with rank 1.
- Switch to **Sarah Fernando** so we can cancel her confirmed booking.
- On `/me`, find the confirmed booking for Lab-A Tuesday 14:00.
- Click **Cancel**.
- A confirmation dialog appears. Confirm the cancellation.
- A toast appears confirming the cancellation: "Booking cancelled." The auto-promotion happens server-side inside the cancel RPC — its effect is visible on the resource page and in the admin audit log, not in this toast.
- Switch back to **Mihir Jain** and navigate to `/me`.
- Mihir now has a **confirmed** booking for the slot (waitlist entry is gone or status shows "promoted") — proof the auto-promote fired.

**Narration:**
> "When Sarah cancels, the engine immediately promotes the top-ranked waiter — Mihir — to a confirmed booking. No admin action needed; it's atomic inside the cancel RPC. Mihir gets his slot back without re-submitting. This is the smart waitlist in action."

---

## Closing Frame (3:50–4:00)

**What to show:**
- Return to `/` with the full resource grid visible.
- SYNAPSE header with the team name or a brief title card overlay.

**Narration:**
> "SYNAPSE: conflict-free by construction, transparent by design, fair by algorithm. Built for CIPHER 2.0 by Segfault Society."

---

## Recording Tips

- Narrate live or record voice-over in post — both work.
- Use the browser's built-in zoom (Cmd/Ctrl +) to ensure all text is readable at 1080p.
- If a toast disappears too quickly, pause the recording and re-trigger the action.
- The Decision Modal score bars animate on open — let them finish before narrating.
- Total target: 3:30–4:00. Do not exceed 5 minutes.
