# Trello hand-off packets

Paste-ready markdown for creating Trello cards from each of the four Q2 prototypes. One file per prototype:

* [`trello-aje-10.md`](./trello-aje-10.md) — Today's Status (Checkin Screen revamp)
* [`trello-aje-11.md`](./trello-aje-11.md) — Paywall (V3 — Jay's pick)
* [`trello-aje-65.md`](./trello-aje-65.md) — Breathing module (existing screen, polished)
* [`trello-aje-66.md`](./trello-aje-66.md) — Fasting Tracker (mini-app revamp)

## How to use

Each packet has three sections, paste-aligned to Trello's input fields:

1. **Card title** — paste into the new-card input box on the Trello board
2. **Card description** — open the card, paste into the description (Trello renders the markdown)
3. **Checklist items** — open the card, add a checklist named "Files Abdul will touch", and paste the items (Trello turns each newline into a separate checklist item)

## Why these exist

Linear is Joe's authoritative ticket tracking. SPiR's dev team works in Trello. These packets bridge the two — every Trello card description carries the cross-refs back to the Linear ticket, the Unity-facing spec doc, and the live URL. So Abdul gets a Trello-native checklist, Joe keeps Linear as the audit trail, and nothing falls between the cracks.

## Stale-by-design

These packets are paste-once. If a spec changes after hand-off, the Trello card will drift from the spec. That's intentional for a one-shot hand-off — chasing live sync is a Trello API integration that wasn't worth the complexity for this batch. If specs do change mid-build, comment on the Trello card and link the updated spec section.

## Hand-off snapshot

These were generated against the GitHub Release [`handoff-2026-q2-v1`](https://github.com/joemacstevens/spir-prototypes/releases/tag/handoff-2026-q2-v1) — Abdul can pin to that tag if he wants a frozen baseline that matches what's in the Trello cards. `main` will keep moving as fixes / late changes land.
