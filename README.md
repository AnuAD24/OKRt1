# OKRt

A quarterly workspace for objectives and key results. Each key result is the distance from a start number to a target. An objective stays **on track** when that progress keeps up with how much of the quarter has already passed.

Scores stay in this browser (`localStorage`). The sample quarter is Q4 2026, with a finished Q3 and an empty Q1 so you can see both a live board and a blank one.

## Run

```bash
npm install
npm run dev
```

Open the URL Vite prints, usually `http://localhost:5173`.

```bash
npm run build
```

## How a score is decided

- Progress is `(current − start) / (target − start)`. If the target is lower than the start (cycle time, incidents), the ratio flips so improvement still counts upward.
- An objective’s progress is the average of its key results.
- Compare that with the fraction of the quarter that has elapsed:
  - **Done** at 100%
  - **On track** when progress is within 5 points of the pace
  - **At risk** when it is within 20 points
  - **Behind** otherwise
  - **Draft** until the objective has a key result
