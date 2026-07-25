# Classification baseline

This folder is the Phase 0 answer key for FocusGhost classification work.
It measures the existing classifier without changing production behavior.

## Files

- `fixtures.v1.json` contains task-and-activity examples derived from the
  classification PDF. The expected value is always one of the public states:
  `focus`, `neutral`, or `distraction`.
- `policy-fixtures.v1.json` contains desired time-based behavior for later
  phases, such as staying quiet on brief distraction visits and prompting
  only after neutral activity lingers.
- `scripts/classification-baseline.mjs` runs the current classifier against
  the classification fixtures.

The `v1` suffix is intentional. If the product meaning changes, add a new
fixture version or make a clearly reviewed update instead of silently changing
the answer key.

## Commands

Run the non-blocking baseline report:

```sh
npm run classification:baseline
```

Run the strict check:

```sh
npm run classification:check
```

The strict check exits with an error while any fixture is misclassified. This
is expected before later phases improve the classifier. It becomes a useful CI
gate once all intended cases pass.

## Metrics

The report includes:

- A confusion matrix showing expected versus predicted status.
- Overall fixture accuracy.
- Precision and recall for focus, neutral, and distraction.
- False-distraction rate: the share of expected focus/neutral cases that the
  current classifier incorrectly calls distraction.
- Contrast-group accuracy. A contrast group uses the same activity with
  different session goals to verify that FocusGhost actually uses the task.

The evaluator maps current internal labels to the future public model:

- `focus` and `supportive` become `focus`.
- `neutral` and `needs-clarification` become `neutral`.
- `distraction` and `hard-distraction` become `distraction`.

## Recorded Phase 0 baseline

Recorded on 2026-07-24 against the classifier that existed before the later
implementation phases:

- 47 classification fixtures.
- 21 correct and 26 incorrect.
- 44.7% overall accuracy.
- 12.8% false-distraction rate.
- 1 of 5 contrast groups fully correct.
- Focus recall: 29.2%.
- Neutral recall: 53.3%.
- Distraction recall: 75.0%.

These numbers are not release targets. They are the starting measurement that
later branches should improve without increasing false distraction labels.
