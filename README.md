# Welcome to PhysicsQuest

Static web app for MYP 4-5 physics review.

## Included

- Student exam mode with a 45-minute timer
- Practice mode without a timer
- Multiple choice, fill in the blank, and numerical questions with tolerance
- Hint button, instant feedback, and a color-coded progress panel
- Teacher Mode for pasting and saving questions
- Local question bank with automatic refresh across tabs in the same browser
- Teacher statistics based on saved attempt history

## Run

Open [index.html](/Users/christian.mercado/.codex/workspaces/default/physicsquest/index.html) in a browser.

## Teacher input format

Blocks are separated by a blank line.

```text
Topic: Forces
What is the SI unit of force?
Answer: newton | N
Hint: It is named after Isaac Newton.

Topic: Motion
What is the speed of an object that travels 12 m in 3 s?
Answer: 4
Tolerance: 0.1
Hint: Speed = distance / time.

Topic: Energy
Which store of energy increases when an object is lifted higher?
A) Thermal energy
B) Gravitational potential energy*
C) Sound energy
D) Magnetic energy
Hint: Height matters.
```

## Live update note

This version syncs instantly between tabs on the same browser using `localStorage`, `storage` events, and `BroadcastChannel`.

For multi-device classroom sync, the next step is wiring the same question bank methods to Supabase or Firebase.
