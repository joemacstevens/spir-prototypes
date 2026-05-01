# AJE-12 — Placeholder Assumptions

The prototype at <https://xp-gates.vercel.app> uses placeholders where the ticket has open questions.
This file maps each placeholder to the question it depends on, so Jay can answer inline and the spec gets concrete values.

---

## 1. Which features are gated?

**Ticket says:**
> Full list of features to gate (soundscapes confirmed; what else? meditation tracks, quizzes, AI coach, etc.?)

**Prototype assumes:** soundscapes only. The mock catalog has 6 entries — 2 free (Lo-Fi Beats, Pink Noise) and 4 XP-gated (Forest Rain, Ocean Waves, Mountain Wind, City Hum).

**Spec assumes:** the popup is **generic** — any caller can use it for any gated feature. The 5 existing soundscape entry points in [SoundManager.cs](../../Assets/My%20Scripts/SoundManager.cs) and the breathing-mode entry point in [BreathworkPanel.cs:191](../../Assets/My%20Scripts/BreathworkPanel.cs#L191) all work today. New gated surfaces just call `BuySubscriptionPopup.Show(canvas)` and set `xpCost` / `itemDisplayName`.

**What Jay should answer:**
- Soundscapes: confirmed.
- Meditation tracks: gated, free, or both?
- AI coach: gated or always free?
- Quizzes / advanced detail questions: gated?
- Anything else?

---

## 2. XP cost per gated item

**Ticket says:**
> XP cost per gated item (per-feature? per-item? tiered?)

**Prototype assumes:** flat costs per soundscape — 50 / 50 / 75 / 100 XP. Used illustrative variation (75 + 100) so Jay can see the popup work with non-uniform pricing. Default starting balance is 230 XP.

**Spec assumes:** real costs come from `DataConfig.featureCategories` (server-driven), looked up via `DataConfig.GetXPValueForName(name)` ([DataConfig.cs:235](../../Assets/My%20Scripts/DataConfig.cs#L235)). Pro users get `proDiscount` % off; Max users get `maxDiscount` % off. The popup just renders the final number — pricing logic is upstream.

**What Jay should answer:**
- Are soundscape costs uniform (e.g. all 50) or varied (e.g. premium tracks more expensive)?
- Is the cost model per-feature (one cost per category like "soundscapes") or per-item (Forest Rain = 50, Mountain Wind = 75)?
- Is there a tiered cost (e.g. Pro pays 25, non-Pro pays 50, Max pays free)?

---

## 3. Consumption rules

**Ticket says:**
> When a user spends XP, is it consumed forever or returns somehow?

**Prototype assumes:** consumed forever. One-time deduct via `AddandRemoveXp(-xp)`. Once unlocked, the soundscape is permanently free to play. No refund. This matches the existing in-app behaviour today.

**Spec assumes:** same as prototype. No refund logic, no expiration timer, no "rent for 24 hours" model.

**What Jay should answer:**
- Permanent unlock (current assumption) or time-limited (rent)?
- If rent, how long — session, day, week?
- Refundable on cancel? (today there's no cancel-after-confirm UI, so this only matters if cancel-after-confirm becomes a flow)

---

## 4. Variant choice — A or B

**Ticket doesn't ask this directly**, but the prototype shows two popup directions and Jay needs to pick one.

**Prototype assumes:** Jay picks one before Abdul builds. Both are implementable; both reuse the existing `BuySubscriptionPopup` script and prefab (different anchoring + animation).

**Spec hedges:** §2 of [SPEC.md](./SPEC.md) covers both prefab structures. §3 covers both animations. The chosen variant determines which `*Animator.cs` is on the prefab and how the body is anchored.

**What Jay should answer:**
- Variant A (centered modal — closest to today)
- Variant B (bottom sheet — more modern, less disruptive)
- Or a third direction we haven't shown

---

## 5. Insufficient-XP message copy

**Ticket doesn't ask this**, but the prototype uses a placeholder message.

**Prototype assumes:**
> "You need {N} more XP to unlock {item}. Get more XP through SPiR Pro or SPiR Max — or earn it through habits."

This is a placeholder. Jay may want shorter, longer, or differently framed (e.g. lead with the upsell vs. with the earn-path).

---

## 6. "See plans" button label

**Prototype assumes:** "See plans" — neutral, action-oriented.

**Alternatives Jay might prefer:**
- "Upgrade"
- "Get Pro"
- "Get more XP"
- "Compare plans"

---

## 7. Telemetry destination

**Codebase has no analytics layer today** (verified — zero matches for `Mixpanel`, `Firebase`, `LogEvent` across `Assets/My Scripts/`).

**Spec assumes:** a `Telemetry.cs` shim that `Debug.Log`'s for now and gets swapped to a real SDK later. The 4 event names are committed: `gate_shown`, `spend_confirmed`, `spend_canceled`, `paywall_cued`.

**What needs to be decided eventually (not blocking AJE-12):**
- Mixpanel / Firebase / Amplitude / something else?
- Does `NetworkAPImanager` already have an event-emit hook we should use?
- Per-user properties to attach (Pro/Max state, total XP, days since signup)?

---

## 8. Free-tier soundscape names

**Prototype assumes:** "Lo-Fi Beats" and "Pink Noise" are free (always-unlocked).

**Reality:** [SoundManager.cs:194-198](../../Assets/My%20Scripts/SoundManager.cs#L194) shows `PlayLoFiBeats` is the only no-gate, always-free track. "Pink Noise" is invented.

**What Jay should clarify:**
- How many soundscapes are free vs gated in the real catalog?
- Are any free for all users, vs free only for Pro/Max?
