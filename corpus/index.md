# Corpus — work tracking

LLM-maintained work lifecycle for *extract-your-soul-md*. The durable
counterpart to the in-session `TodoWrite` list. Managed via the `corpus-flow`
skill (todos → briefs → done + log).

This tracks **engineering work** (what we're building). For the **research &
design knowledge** (what we know), see the separate LLM Wiki at
[docs/wiki/](../docs/wiki/index.md).

## Layout

```
corpus/
  index.md              ← this file (navigation)
  log.md                ← chronological, append-only: shipped work & decisions
  todos/                ← captured ideas/tasks as prose (<date>-<slug>.md)
  briefs/
    todo/               ← numbered work specs ready to build (<NN>-<slug>.md)
    done/               ← completed briefs (number kept, immutable + outcome note)
    superseded/         ← briefs later undone (one-line top note explaining why)
```

## Lifecycle

```
todos/<date>-<slug>.md  →  briefs/todo/<NN>-<slug>.md  →  briefs/done/<NN>-<slug>.md  +  log.md
   (capture)                  (promote → grill → build)      (move, keep number, log it)
```

## Current state

Nothing tracked yet. Say "add a todo …" to capture the first piece of work.
