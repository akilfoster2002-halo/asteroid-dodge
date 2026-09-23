# Asteroid Dodge — a block-coding test

Asteroids fly across space from the right. The student's **Avatar** starts
with no code. To pass, they write it in blocks:

1. **Movement.** Up, down, left and right on the keys: an `if <key [..] pressed?>`
   and a `change y by` / `change x by` for each direction, all inside a `forever`
   (or the keys are only checked once).
2. **Stay inside.** The Avatar must not leave the arena. They have to use
   `<touching [edge]?>`: right after each move, if the Avatar is touching the edge, move it
   straight back by the same amount.
3. **Game over.** `if <touching [Asteroid]?> then stop [all]`. Without it the rocks pass
   straight through the Avatar and the game never ends.

Then they press **▶ RUN** and try to survive. The time they last is their score.

A checklist in the corner ticks off each part (up, down, left, right, stays inside,
game over on hit).
It only ticks when it sees **the student's program** do the thing. The room never moves
the Avatar or ends the game by itself. When a rock overlaps the Avatar and the program
keeps running, the Avatar flashes red. When it gets past the border, a warning tells them
to use `touching edge?`. That is how a student finds out a rule is missing.

**Stays inside** only ticks when all three of these hold: the program contains
`touching [edge]?`, the Avatar has spent half a second pressed against the border with a
key held, and it never got past the border during that run. Without a fence, the Avatar
crosses the edge in a few frames, so the tick can't be earned by accident.

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

`touching edge?` is the framework's own block, unchanged. The room sets its walls
(`LEVELS.dodge`) to line up exactly with the drawn border (x ±16, y ±9).
