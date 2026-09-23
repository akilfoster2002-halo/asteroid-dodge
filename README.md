# Asteroid Dodge — a block-coding test

Asteroids fly across space from the right. The student's **Avatar** starts
with no code. To pass, they write it in blocks:

1. **Movement.** Up, down, left and right on the keys: an `if <key [..] pressed?>`
   and a `change y by` / `change x by` for each direction, all inside a `forever`
   (or the keys are only checked once).
2. **Game over.** `if <touching [Asteroid]?> then stop [all]`. Without it the rocks pass
   straight through the Avatar and the game never ends.

Then they press **▶ RUN** and try to survive. The time they last is their score.

A checklist in the corner ticks off each part (up, down, left, right, game over on hit).
It only ticks when it sees **the student's program** do the thing. The room never moves
the Avatar or ends the game by itself. When a rock overlaps the Avatar and the program
keeps running, the Avatar flashes red. That is how a student finds out the collision
rule is missing.

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
| **`dodge.js`** | the room: arena, Avatar and Asteroids, the Asteroids' scripts, checklist, clock |
| **`boot.js`** | renderer, keyboard and frame loop (the same shim as Pong's standalone page) |

The Asteroids are ordinary block scripts that anyone can click and read. A hidden spawner
runs `forever: create a clone of myself, wait (random)`. Each clone picks a random
height, size and speed, then tumbles leftwards and deletes itself off-screen. They speed
up as the timer climbs.

**One change to `vm.js`:** `touching [name]?` now checks every object with that name,
clones included, and skips hidden ones. This is how Scratch reads it. Before, it only
checked the first object with the name, which here is the hidden spawner, so
`touching Asteroid?` could never be true.
