# Asteroid Dodge — a block-coding test

Asteroids fly across space from the right. The student's **Avatar** is a rocket, and it
starts with no code. To pass, they write it in blocks:

1. **Movement.** Up, down, left and right on the keys: an `if <key [..] pressed?>`
   and a `change y by` / `change x by` for each direction, all inside a `forever`
   (or the keys are only checked once).
2. **Point the way you fly.** The rocket must always point in the direction it is flying,
   using `point in direction ( )`: **0** is up, **90** is right, **180** is down and
   **−90** is left. The brief shows these numbers. For example, under `key [up]`:
   `point in direction (0)`, then `change y by 0.3`.
3. **Game over.** `if <touching [Asteroid]?> then stop [all]`. Without it the rocks pass
   straight through the Avatar and the game never ends.

Then they press **▶ RUN** and try to survive. The time they last is their score.

A checklist in the corner ticks off each part (up, down, left, right, points the way it
flies, game over on hit).
It only ticks when it sees **the student's program** do the thing. The room never moves
the Avatar or ends the game by itself. When a rock overlaps the Avatar and the program
keeps running, the rocket flashes red. When it flies one way while pointing another, a
warning says so, e.g. *Flying right but pointing 0°*. That is how a student finds out a
rule is missing.

**Points the way it flies** is judged one direction at a time, and the checklist shows a
badge for each (↑ up, ↓ down, ← left, → right). Whenever a key moves the rocket straight
up, down, left or right, the room compares that with the way it is pointing. A badge
lights after a sixth of a second of flying that way pointed the right way. The item ticks
when all four are lit. Diagonals (two keys at once) are not judged.

## Handing it in: ⤓ PDF

The **⤓ PDF** button asks for the student's name. It then downloads
`asteroid-dodge-<name>.pdf`, which contains:
- the name, date and best time
- the checklist as it stands
- the Avatar's script as text, one block per line, indented the way the blocks nest,
  with `end` closing each `if`, `forever` and `repeat`

The PDF is written by `dodge.js` itself, with no library, so it works offline like the
rest of the folder.

## Running it

It is a plain static folder, with no build step and no install:

```bash
python3 -m http.server 8793
```

Then open http://localhost:8793. Press `C` (or **▦ BLOCKS**) to open the editor.

- **Teacher answer key:** open `http://localhost:8793/?answer`. The reference solution is
  loaded and is never saved over a student's work.
- A student's Avatar code is saved in their browser (`localStorage`). The **↺** button
  resets it.

## How it is built

It uses the block-coding framework from **MESACS 0.2a**, with the same files the full
game uses:

| file | job |
|---|---|
| `blocks.js` | the language: every block as data |
| `vm.js` | runs the blocks: threads, clones, `touching`, `stop all` |
| `coder.js` | the drag-and-drop block editor |
| `strings.js`, `app.css`, `fonts/`, `lib/three.classic.js` | text, styles, typefaces, renderer |
| **`dodge.js`** | the room: arena, Avatar and Asteroids, the Asteroids' scripts, checklist, clock, PDF export |
| **`boot.js`** | renderer, keyboard and frame loop (the same shim as Pong's standalone page) |

The Asteroids are ordinary block scripts that anyone can click and read. A hidden spawner
runs `forever: create a clone of myself, wait (random)`. Each clone picks a random
height, size and speed, then tumbles leftwards and deletes itself off-screen. They speed
up as the timer climbs.

**One change to `vm.js`:** `touching [name]?` now checks every object with that name,
clones included, and skips hidden ones. This is how Scratch reads it. Before, it only
checked the first object with the name, which here is the hidden spawner, so
`touching Asteroid?` could never be true.

**Direction is Scratch's.** In the original framework, `direction 0` pointed *down* the
top-down screen and angles went anticlockwise. This copy of `vm.js` uses Scratch's compass
instead, which is what students know: 0 up, 90 right, 180 down, −90 left, clockwise.
`point in direction`, `move`, `turn` and `point towards` all agree with it.

**The rocket** is drawn by `dodge.js`. The VM builds its usual shape for the Avatar, and the
room hides it and hangs a rocket model underneath (hull, nose, porthole, fins and an exhaust
flame while it moves). The VM's own rotation then turns the rocket, so it points exactly
where `direction` says.

`touching [edge]?` is no longer part of the test, but it still works. The dropdown also
offers `up edge`, `down edge`, `left edge` and `right edge` for single walls, and the walls
line up with the drawn border (x ±16, y ±9).
