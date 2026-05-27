# AJE-12 — XP Payment Gates · Unity Implementation Spec

> Build instructions for [Abdul](https://github.com/) to implement the in-app XP-spend popup once Jay picks a direction (Variant A or B) and answers the open questions in [ASSUMPTIONS.md](./ASSUMPTIONS.md).
>
> Live prototype: <https://xp-gates.vercel.app>
> Linear ticket: [AJE-12](https://linear.app/ajeo/issue/AJE-12)

---

## 0. TL;DR

The popup already exists in the codebase. **Refactor `BuySubscriptionPopup` in place** — keep the script name, prefab name, and all 6 call sites (5 in `SoundManager.cs`, 1 in `BreathworkPanel.cs`). The visible change is: split the popup body into a "sufficient" tree and an "insufficient" tree, decide which is visible in `OnEnable` based on `DataConfig.TotalXP >= xpCost`, fire 4 telemetry events, and (for Variant B only) replace the scale-in tween with a slide-up tween.

That's the whole job. No new prefab, no migration of call sites, no Pro/Max-discount math changes.

---

## 1. Approach: refactor in place vs. new prefab

**Recommendation: refactor in place.**

`BuySubscriptionPopup.cs` ([Assets/My Scripts/BuySubscriptionPopup.cs](../../Assets/My%20Scripts/BuySubscriptionPopup.cs)) is 57 lines. It's a `SingletonBehaviourUI<BuySubscriptionPopup>` that loads `Resources/Prefabs/UI/Panels/BuySubscriptionPopup.prefab` automatically via the `SingletonBehaviourUI<T>.Show(canvas)` static at [SingletonBehaviourUI.cs:25](../../Assets/My%20Scripts/SingletonBehaviourUI.cs#L25). It already exposes the four affordances the new design needs: `xpText`, `headingText`, `buttonHeading`, `buyUsingXP` (Action), `onHide` (Action), `showSubscriptionPanel(bool isXP)`.

The 6 callers — all in `SoundManager.cs` (5 `PlayX` methods at [SoundManager.cs:24-237](../../Assets/My%20Scripts/SoundManager.cs#L24)) and `BreathworkPanel.cs:191` — already do the work the new design needs at the call site:

```csharp
// SoundManager.cs:34-58, abridged — pattern repeats 5×
BuySubscriptionPopup.Hide();
BuySubscriptionPopup.Show(GameManager.instance.footerCanvas.gameObject);
tempAudioClip = binuarl1;

int baseXP = DataConfig.GetXPValueForName("Flow State Activation");
int displayXP = baseXP;
if (DataConfig.isMaxSubscribed)      displayXP = Mathf.RoundToInt(baseXP * (1f - (DataConfig.maxDiscount / 100f)));
else if (DataConfig.isProSubscribed) displayXP = Mathf.RoundToInt(baseXP * (1f - (DataConfig.proDiscount / 100f)));

BuySubscriptionPopup.Instance.headingText.text = "Play\nSounds";
BuySubscriptionPopup.Instance.xpText.text = $"-{displayXP} XP to Start";
BuySubscriptionPopup.Instance.buyUsingXP = UseXpToContinueFun;
```

**Crucial:** the discount math, the XP-cost lookup, and the `buyUsingXP` callback already live at the call site. The popup's job is purely to render the state and surface the 3 user actions. Refactoring in place means the call sites need **zero change**.

A new `XPGatePopup` prefab would force updating every call site. There's no payoff for that disruption.

---

## 2. Prefab structure

> `Assets/Resources/Prefabs/UI/Panels/BuySubscriptionPopup.prefab` (existing — edit)

The prefab is loaded by `SingletonBehaviourUI<BuySubscriptionPopup>.Show(canvas)` and parented to `GameManager.instance.footerCanvas` (passed by every caller). Keep that root structure. Replace the body.

### Variant A — Centered modal (recommended starting point)

Keep the existing `PopupAndDownAnimator` component on the prefab root — it already does scale 0→1 with `Ease.OutBack` 0.5s, which matches the prototype.

```
BuySubscriptionPopup (RectTransform, anchors: stretch/stretch, offsets: 0)
├── PopupAndDownAnimator                    (existing component — keep)
├── BuySubscriptionPopup (script)           (existing — body refactored in §4)
│
├── DimBackground (Image, color #000000B5)  (full-rect; tappable to cancel)
│   └── Button (interactable=true, OnClick → BuySubscriptionPopup.OnCancel)
│
└── Card (RectTransform, anchored center, sizeDelta: 320×auto)
    ├── CanvasGroup                         (controls fade + interactable)
    ├── Background (Image, rounded rect 24px, gradient)
    ├── IconWrap (Image, 64×64, rounded 18px) — TWO sprite states
    │   ├── icon-bolt.png  (purple bg)  — used in Sufficient state
    │   └── icon-warn.png  (coral bg)   — used in Insufficient state
    ├── Heading (TMP_Text, "Spend N XP to unlock" / "You don't have enough XP")
    ├── ItemName (TMP_Text, eyebrow style — already wired to headingText)
    │
    ├── Stack (VerticalLayoutGroup, spacing 10)
    │   ├── CostRow (Horizontal: Label "Cost" / Value "{N} XP")
    │   └── BalanceRow (Horizontal: Label "You have" / Value "{TotalXP} XP")
    │
    ├── DeficitMessage (TMP_Text, hidden by default — only Insufficient)
    │
    └── ButtonRow (HorizontalLayoutGroup, spacing 10)
        ├── CancelButton (TMP_Text "Cancel", secondary style, OnClick → OnCancel)
        └── PrimaryButton (TMP_Text "Confirm" / "See plans", primary style, OnClick → UseXP)
```

### Variant B — Bottom sheet (alternative)

Same body — different anchoring + animation.

```
BuySubscriptionPopup (RectTransform, anchors: 0,0 to 1,0, pivot: 0.5,0)
├── BottomSheetAnimator (NEW component — see §3)
├── BuySubscriptionPopup (script)
│
├── DimBackground (Image, color #00000088, anchors stretch)
│
└── Sheet (RectTransform, anchored bottom, height: auto, padding 22px)
    ├── DragHandle (Image, 36×4, rounded 100px, alpha 0.18 — decorative)
    ├── Header (Horizontal: Icon 44px / [Heading + ItemName])
    ├── StatsGrid (HorizontalLayoutGroup, 2 columns)
    │   ├── CostStat (Vertical: "COST" eyebrow / "50 XP" value)
    │   └── BalanceStat (Vertical: "YOU HAVE" eyebrow / "230 XP" value)
    ├── DeficitMessage (TMP_Text, hidden by default)
    └── ButtonRow (HorizontalLayoutGroup, Cancel / Primary)
```

Pivot at `0.5, 0` so the sheet sits on the bottom edge. The animator slides it from `anchoredPosition.y = -sheetHeight` (off-screen below) to `0`.

### Naming

Match existing prefab conventions in `Assets/Resources/Prefabs/UI/Panels/` — see [BuildLoadoutPopup.prefab](../../Assets/Resources/Prefabs/UI/Panels/BuildLoadoutPopup.prefab), [CongratulationPanelPopUp.prefab](../../Assets/Resources/Prefabs/UI/Panels/CongratulationPanelPopUp.prefab).

---

## 3. Animation

### Variant A — keep `PopupAndDownAnimator`

`Assets/My Scripts/PopupAndDownAnimator.cs` (already attached to the existing prefab):

```csharp
private void OnEnable()
{
    transform.localScale = hiddenScale;                       // Vector3.zero
    transform.DOScale(popupScale, animationDuration)          // → Vector3.one, 0.5s
        .SetEase(Ease.OutBack);
}
private void OnDisable()
{
    transform.DOScale(hiddenScale, animationDuration).SetEase(Ease.InBack);
}
```

No code changes. Verify the component is on the prefab root after refactor.

### Variant B — new `BottomSheetAnimator`

New file: `Assets/My Scripts/BottomSheetAnimator.cs`. Mirror the existing slide-up tween at [GameManager.cs:559, 569](../../Assets/My%20Scripts/GameManager.cs#L559) (which already drives `lockInTheDayPopupPanel`):

```csharp
using UnityEngine;
using DG.Tweening;

public class BottomSheetAnimator : MonoBehaviour
{
    public float showDuration = 1.0f;   // GameManager.cs:569
    public float hideDuration = 0.5f;   // GameManager.cs:559

    private RectTransform rect;
    private Vector2 hidden;
    private Vector2 visible = Vector2.zero;

    private void Awake()
    {
        rect = GetComponent<RectTransform>();
        // Sheet is anchored bottom (pivot 0.5, 0). Hide it one full height below.
        hidden = new Vector2(0, -rect.rect.height);
    }

    private void OnEnable()
    {
        rect.anchoredPosition = hidden;
        rect.DOAnchorPos(visible, showDuration).SetEase(Ease.Linear);
    }

    private void OnDisable()
    {
        // Mirrors GameManager.HideLockInTheDayPopup (GameManager.cs:559)
        rect.DOAnchorPos(hidden, hideDuration).SetEase(Ease.Linear);
    }
}
```

**If Jay wants the sheet to feel snappier than `Ease.Linear`**, swap to `Ease.OutCubic` for show and `Ease.InCubic` for hide. Don't change the durations — the existing in-app slide-up at 1.0s is the established rhythm.

---

## 4. State logic — `BuySubscriptionPopup.cs` body

Replace the body of `BuySubscriptionPopup.cs` with the version below. Public surface (`xpText`, `headingText`, `buttonHeading`, `buyUsingXP`, `onHide`, `showSubscriptionPanel`, `UseXP`, `OnCancel`) stays identical so the 6 call sites need no changes.

```csharp
using System;
using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class BuySubscriptionPopup : SingletonBehaviourUI<BuySubscriptionPopup>
{
    // === Public surface — UNCHANGED. SoundManager / BreathworkPanel set these. ===
    public Action buyUsingXP;
    public Action onHide;
    public TMP_Text xpText;          // Existing — kept for backwards compat with current callers
    public TMP_Text headingText;     // Existing — eyebrow now (item name)
    public TMP_Text buttonHeading;   // Existing — kept; legacy "Subscribe For More" / discount label

    // === New serialized refs for the redesigned body ===
    [Header("Refactor — new body refs")]
    public GameObject sufficientGroup;     // Cost+Balance rows + Confirm button
    public GameObject insufficientGroup;   // Cost+Balance rows + DeficitMsg + See plans
    public TMP_Text mainHeading;           // "Spend N XP to unlock" / "You don't have enough XP"
    public TMP_Text costValue;             // "50 XP"
    public TMP_Text balanceValue;          // "230 XP"
    public TMP_Text deficitMessage;        // "You need 55 more XP to unlock {item}..."
    public Image iconImage;                // bolt or warn sprite
    public Sprite iconSufficient;
    public Sprite iconInsufficient;
    public Button primarySufficient;       // "Confirm"
    public Button primaryInsufficient;     // "See plans"
    public Button cancelButton;

    // === Caller-supplied state (set after Show, before OnEnable runs body) ===
    [HideInInspector] public int xpCost;
    [HideInInspector] public string itemDisplayName;

    private void OnEnable()
    {
        // Existing legacy text — keep behaviour for callers that still drive it.
        if (DataConfig.isProSubscribed)
            buttonHeading.text = DataConfig.isMaxSubscribed ? "Max User (75% OFF)" : "Pro User (50% OFF)";
        else
            buttonHeading.text = "Subscribe For More";

        // New body. Defaults if caller didn't set xpCost/itemDisplayName (legacy path).
        // Legacy callers parse the cost out of xpText — we keep that working below.
        if (xpCost == 0 && xpText != null)
        {
            // Legacy: "$-{N} XP to Start". Cheap parse, never throws.
            int parsed;
            string digits = new string(xpText.text.Where(char.IsDigit).ToArray());
            if (int.TryParse(digits, out parsed)) xpCost = parsed;
        }
        if (string.IsNullOrEmpty(itemDisplayName) && headingText != null)
        {
            itemDisplayName = headingText.text.Replace("\n", " ");
        }

        bool sufficient = DataConfig.TotalXP >= xpCost;

        sufficientGroup.SetActive(sufficient);
        insufficientGroup.SetActive(!sufficient);
        iconImage.sprite = sufficient ? iconSufficient : iconInsufficient;

        costValue.text     = $"{xpCost} XP";
        balanceValue.text  = $"{DataConfig.TotalXP} XP";

        if (sufficient)
        {
            mainHeading.text = $"Spend {xpCost} XP to unlock";
        }
        else
        {
            int deficit = xpCost - DataConfig.TotalXP;
            mainHeading.text = "You don't have enough XP";
            deficitMessage.text =
                $"You need {deficit} more XP to unlock {itemDisplayName}. " +
                "Get more XP through SPiR Pro or SPiR Max — or earn it through habits.";
        }

        // Haptic — gentle "show" buzz. Matches the prototype.
        // Vibration.cs:26
        Vibration.Vibrate(20);

        // Telemetry — gate_shown
        Telemetry.Log("gate_shown", new Dictionary<string, object>
        {
            { "item",    itemDisplayName },
            { "cost",    xpCost },
            { "balance", DataConfig.TotalXP },
            { "state",   sufficient ? "sufficient" : "insufficient" },
        });
    }

    /// Wired to the Confirm button (sufficient case).
    public void UseXP()
    {
        // Strong haptic — matches GameManager streak-claim pattern (GameManager.cs:522-528)
#if UNITY_IOS && !UNITY_EDITOR
        iOSHapticFeedback.Instance.TriggerOneShot(iOSHapticFeedback.iOSFeedbackType.ImpactMedium);
#elif UNITY_ANDROID && !UNITY_EDITOR
        AndroidHapticFeedback.Instance.TriggerOneShot(AndroidHapticFeedback.AndroidHapticType.Medium);
#endif

        Telemetry.Log("spend_confirmed", new Dictionary<string, object>
        {
            { "item",       itemDisplayName },
            { "cost",       xpCost },
            { "newBalance", DataConfig.TotalXP - xpCost },
        });

        // Caller's spend logic — stays identical. SoundManager.UseXpToContinue does:
        //   GameManager.instance.AddandRemoveXp(-xp, "", clip.name);  (GameManager.cs:1585)
        //   plays the audio
        //   BuySubscriptionPopup.Hide();
        buyUsingXP?.Invoke();
    }

    /// Wired to the See plans button (insufficient case).
    public void GoToPaywall()
    {
        Telemetry.Log("paywall_cued", new Dictionary<string, object>
        {
            { "item",    itemDisplayName },
            { "cost",    xpCost },
            { "balance", DataConfig.TotalXP },
            { "deficit", xpCost - DataConfig.TotalXP },
        });
        showSubscriptionPanel(true);
        Hide();
    }

    public void OnCancel()
    {
        Telemetry.Log("spend_canceled", new Dictionary<string, object>
        {
            { "item",    itemDisplayName },
            { "balance", DataConfig.TotalXP },
        });
        onHide?.Invoke();
        Hide();
    }

    /// Existing — paywall handoff. Unchanged.
    public void showSubscriptionPanel(bool isXP)
    {
        SubscriptionPanel.Hide();
        SubscriptionPanel.Show(GameManager.instance.footerCanvas.gameObject);
        if (isXP)
            SubscriptionPanel.Instance.IAP_OptionPanel.transform.localPosition = new Vector3(0, 1200, 0);
    }

    /// Cleanup the per-show state when the singleton is destroyed.
    protected override void OnDestroy()
    {
        xpCost = 0;
        itemDisplayName = null;
        buyUsingXP = null;
        onHide = null;
        base.OnDestroy();
    }
}
```

### Migration of call sites — optional one-liner

Existing call sites work unchanged because of the legacy parse fallback in `OnEnable`. To make them more explicit, callers can set the new fields:

```csharp
// In SoundManager.PlayFlowStateActivation (and the other 4 PlayX methods + BreathworkPanel)
BuySubscriptionPopup.Show(GameManager.instance.footerCanvas.gameObject);
BuySubscriptionPopup.Instance.xpCost = displayXP;                     // NEW (optional)
BuySubscriptionPopup.Instance.itemDisplayName = "Flow State Activation"; // NEW (optional)
// existing lines below stay identical
BuySubscriptionPopup.Instance.headingText.text = "Play\nSounds";
BuySubscriptionPopup.Instance.xpText.text = $"-{displayXP} XP to Start";
BuySubscriptionPopup.Instance.buyUsingXP = UseXpToContinueFun;
```

This is a 2-line addition per call site; entirely optional but makes the refactor cleaner long-term.

---

## 5. Haptics

| Moment | Method | Where |
|---|---|---|
| Popup show | `Vibration.Vibrate(20)` | [Vibration.cs:26](../../Assets/My%20Scripts/Vibration.cs#L26) |
| Confirm tap (iOS) | `iOSHapticFeedback.Instance.TriggerOneShot(iOSHapticFeedback.iOSFeedbackType.ImpactMedium)` | mirror [GameManager.cs:523](../../Assets/My%20Scripts/GameManager.cs#L523) |
| Confirm tap (Android) | `AndroidHapticFeedback.Instance.TriggerOneShot(AndroidHapticFeedback.AndroidHapticType.Medium)` | mirror [GameManager.cs:527](../../Assets/My%20Scripts/GameManager.cs#L527) |
| Cancel / See plans | None | – |

Cancel intentionally has no haptic — non-destructive, low-stakes action.

---

## 6. Telemetry — missing dependency

**The codebase does not have an analytics layer today.** A grep across `Assets/My Scripts/` for `Mixpanel`, `FirebaseAnalytics`, `LogEvent`, `TrackEvent`, `Analytics.` returns zero hits.

This ticket needs 4 events. Recommend a tiny shim now, swap the body when a real analytics SDK is wired up later.

### `Assets/My Scripts/Telemetry.cs` (new)

```csharp
using System.Collections.Generic;
using UnityEngine;

public static class Telemetry
{
    public static void Log(string eventName, Dictionary<string, object> props)
    {
        // Placeholder — wire to Mixpanel / Firebase / NetworkAPImanager when a real
        // analytics layer is approved. For now: structured Debug.Log so events are
        // visible in Console + adb logcat + Xcode console without losing payload.
        var sb = new System.Text.StringBuilder();
        sb.Append("[telemetry] ").Append(eventName);
        if (props != null)
        {
            sb.Append(" {");
            bool first = true;
            foreach (var kv in props)
            {
                if (!first) sb.Append(", ");
                sb.Append(kv.Key).Append(": ").Append(kv.Value);
                first = false;
            }
            sb.Append('}');
        }
        Debug.Log(sb.ToString());
    }
}
```

### Event payloads (must stay identical to the prototype's `console.log` shape)

| Event | Fired in | Payload |
|---|---|---|
| `gate_shown` | `OnEnable` (after state branch decided) | `item`, `cost`, `balance`, `state` ("sufficient" / "insufficient") |
| `spend_confirmed` | `UseXP()` (Confirm tap, sufficient path) | `item`, `cost`, `newBalance` |
| `spend_canceled` | `OnCancel()` | `item`, `balance` |
| `paywall_cued` | `GoToPaywall()` (See plans tap, insufficient path) | `item`, `cost`, `balance`, `deficit` |

When the real analytics layer lands, the only change is in `Telemetry.cs`'s body — no call-site touchups.

---

## 7. Instantiation / loading

No change. `SingletonBehaviourUI<BuySubscriptionPopup>.Show(canvas)` ([SingletonBehaviourUI.cs:25](../../Assets/My%20Scripts/SingletonBehaviourUI.cs#L25)) auto-loads `Resources/Prefabs/UI/Panels/BuySubscriptionPopup`. All 6 callers already pass `GameManager.instance.footerCanvas.gameObject`. Keep this.

---

## 8. Soundscape integration point

Already wired. The 5 entry points:

| Method | Line | Triggers |
|---|---|---|
| `SoundManager.PlayFlowStateActivation` | [SoundManager.cs:24](../../Assets/My%20Scripts/SoundManager.cs#L24) | `BuySubscriptionPopup.Show` + sets cost via `DataConfig.GetXPValueForName("Flow State Activation")` |
| `SoundManager.PlayRestfulClarity` | [SoundManager.cs:59](../../Assets/My%20Scripts/SoundManager.cs#L59) | same pattern |
| `SoundManager.PlayCreativeBrainstorm` | [SoundManager.cs:94](../../Assets/My%20Scripts/SoundManager.cs#L94) | same pattern |
| `SoundManager.PlayEnergy_Boost` | [SoundManager.cs:129](../../Assets/My%20Scripts/SoundManager.cs#L129) | same pattern |
| `SoundManager.PlayMeditation` | [SoundManager.cs:200](../../Assets/My%20Scripts/SoundManager.cs#L200) | same pattern; gated to non-Pro users |

After refactor: zero changes required at any of these sites. They keep calling `BuySubscriptionPopup.Show` + setting `headingText` / `xpText` / `buyUsingXP`. The new popup parses cost from `xpText` if `xpCost` isn't explicitly set (legacy fallback in §4).

The actual **deduct** call still lives at the call site, inside `UseXpToContinue`:

```csharp
// SoundManager.cs:175-192 — unchanged
private void UseXpToContinue(AudioClip audioClip, int xp)
{
    if (DataConfig.TotalXP < xp)
    {
        BuySubscriptionPopup.Instance.showSubscriptionPanel(true);
        // toast: "You Don't have Enough XP"
        return;
    }
    GameManager.instance.AddandRemoveXp(-xp, "", tempAudioClip.name);  // ← deduct via API
    soundPlayer.Stop();
    soundPlayer.clip = tempAudioClip;
    soundPlayer.Play();
    BuySubscriptionPopup.Hide();
}
```

> ⚠️ **Note about double-checking:** the *new* popup also performs the balance check (in `OnEnable`). The caller's `UseXpToContinue` performs the same check. With the new popup, `UseXpToContinue` will only ever be invoked when the popup decided "sufficient" — so the second check inside `UseXpToContinue` is now redundant but harmless. Leave it; defensive against a stale `DataConfig.TotalXP` after a slow background sync.

---

## 9. Edge cases

| Case | Behaviour |
|---|---|
| User has exactly `xpCost` XP | `>=` check passes → confirm path. Spend sets balance to 0. No special handling. |
| User goes to 0 XP | `AddandRemoveXp` already handles this (`NetworkAPImanager.UpdateXp` returns updated balance). No client-side guard needed. |
| Popup open when app backgrounds | `OnApplicationFocus(false)` ([GameManager.cs:1733](../../Assets/My%20Scripts/GameManager.cs#L1733)) doesn't tear down popups. Popup persists; user returns and either confirms, cancels, or dismisses. **No telemetry fires for backgrounding** — only on user interaction. |
| Paywall dismissed without purchase | Today: `showSubscriptionPanel` calls `BuySubscriptionPopup.Hide()` indirectly by destroying the singleton. After refactor: same. User returns to the soundscape grid and must re-tap to see gate again. *Document this in the design doc — don't auto-reopen the gate.* |
| Pro/Max discount applied to cost | `displayXP` is computed at the call site BEFORE calling `Show()`. The popup just renders. The "Member discount: -25%" eyebrow can be added later if Jay wants it visible — for now, keep parity with current behaviour. |
| Network failure during `AddandRemoveXp` | `NetworkAPImanager.UpdateXp` already has success/failure callbacks ([GameManager.cs:1585-1644](../../Assets/My%20Scripts/GameManager.cs#L1585)). Failure is logged via `Debug.Log("xp added successfully")` — i.e., silent. If product wants a retry/error UI, that's a separate ticket. |

---

## 10. File-by-file checklist

| File | Action |
|---|---|
| `Assets/My Scripts/BuySubscriptionPopup.cs` | **Edit** — replace body per §4. Public surface unchanged. |
| `Assets/Resources/Prefabs/UI/Panels/BuySubscriptionPopup.prefab` | **Edit** — restructure per §2 (chosen variant). |
| `Assets/My Scripts/Telemetry.cs` | **Create** — per §6. ~30 lines. |
| `Assets/My Scripts/BottomSheetAnimator.cs` | **Create only if Variant B chosen** — per §3. ~25 lines. |
| `Assets/My Scripts/PopupAndDownAnimator.cs` | **No change** (Variant A reuses; Variant B doesn't reference). |
| `Assets/My Scripts/SoundManager.cs` | **No change required.** Optional 2-line addition per `PlayX` method to set `xpCost` / `itemDisplayName` explicitly. |
| `Assets/My Scripts/BreathworkPanel.cs` | **No change required.** Same optional 2-line addition. |
| `Assets/My Scripts/GameManager.cs` | **No change.** `AddandRemoveXp` already handles deduct. |
| `Assets/My Scripts/DataConfig.cs` | **No change.** `TotalXP`, `GetXPValueForName`, discounts already exposed. |
| `Assets/My Scripts/SubscriptionPanel.cs` | **No change.** Existing `Show` is what we hand off to. (AJE-11 redesigns the visual; this ticket just calls it.) |

---

## 11. Acceptance against AJE-12 ticket

Mapping the ticket's acceptance criteria to this spec:

- [x] **Popup component spec'd: "Spend N XP to unlock [content]" with confirm / cancel.** §2, §4.
- [x] **XP-balance check before showing the spend confirm; insufficient-balance state hands off to the paywall.** §4 — check runs in `OnEnable`, branches into `sufficientGroup` vs `insufficientGroup`. `GoToPaywall()` calls existing `showSubscriptionPanel(true)`.
- [x] **At least one gated surface wired up end-to-end (soundscapes).** §8 — already wired via 5 `SoundManager.PlayX` methods. Refactor preserves wiring.
- [x] **Telemetry: log `gate_shown` / `spend_confirmed` / `spend_canceled` / `paywall_cued` events.** §6 — new `Telemetry.cs` shim + 4 call sites in the popup body.

---

## 12. Open from the ticket — answered or flagged

| Ticket question | Status |
|---|---|
| Full list of features to gate | Soundscapes only confirmed by Jay (2026-04-24). Spec written generic — any caller using `BuySubscriptionPopup` benefits. **Awaiting Jay** for additional surfaces (meditation, AI coach, quizzes?). |
| XP cost per gated item | Real values in `DataConfig.featureCategories` (server-driven via `DataConfig.GetXPValueForName`). Prototype uses 50/75/100 placeholders. **Awaiting Jay** for canonical pricing. |
| Consumption rules | Spec assumes "consumed forever, no refund" (single `AddandRemoveXp(-xp)` call). Matches existing soundscape behaviour. **Awaiting Jay** if there's a refund/expiration concept. |

Variant A vs Variant B: **awaiting Jay's pick from the prototype** at <https://xp-gates.vercel.app>.

---

## 13. Out of scope for this ticket

- New analytics integration (Mixpanel / Firebase). Build only the shim. Real wiring is a separate ticket.
- Swipe-to-dismiss gesture on the bottom sheet (Variant B). Decorative drag handle only.
- Discount badge in the popup ("-25% Pro discount"). Discount is computed upstream; adding the badge is a follow-up if Jay wants it.
- Animations on the catalog tiles (lock → check unlock transition). Today the tile re-renders with new state. If Jay wants a mini lottie, separate ticket.
- Actual paywall UI. Lives in [AJE-11](https://linear.app/ajeo/issue/AJE-11). This spec only calls into `SubscriptionPanel.Show`, which AJE-11 redesigns.
