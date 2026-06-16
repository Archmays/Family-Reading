# AGENTS.md

## Project Identity

This project is a Book Companion Panel for family paper-book reading. It supports a child reading a physical book by providing nearby companion material: book overviews, story review, question cards, background notes, story-related encyclopedia entries, and audio playback.

Do not turn this project into an ebook reader, progress dashboard, check-in product, statistics product, leaderboard, user system, or general admin system.

The home page is a book-materials entrance. It is not a progress dashboard.

## Hard Product Boundaries

- Do not add reading progress features.
- Do not add check-in features.
- Do not add statistics, charts, rankings, badges, streaks, or user accounts.
- Do not add ebook-style full reading pages as the primary experience.
- Do not make OCR full text the child-facing main reading body.

Forbidden state/data field names include:

- `progress`
- `currentChapter`
- `lastRead`
- `completed`
- `streak`
- `duration`
- `checkIn`
- `readingStatus`

These names may appear only in rules that prohibit them. Do not introduce them into data models, sample data, component props, stored state, URLs, or UI copy.

## Source Asset Safety

`source/` contains raw source material. Do not delete, move, rename, compress, overwrite, or re-encode any original PDF or MP3 file under `source/`.

Do not copy the original PDF into a public publishing directory.

When future processing is approved, derived assets must be written outside `source/`.

## Deployment Compatibility

Every implementation change must stay compatible with static GitHub Pages deployment:

- No server requirement.
- No database requirement.
- No login requirement.
- No private runtime service requirement.
- Use asset paths that can work under a GitHub Pages project subpath.
- After app code exists, run the project build after each meaningful change.

## Engineering Behavior

- Keep changes surgical and tied to the user's request.
- Prefer the simplest implementation that satisfies the current phase.
- Do not add speculative features or abstractions.
- If source asset boundaries or titles are uncertain, write a review document and stop before destructive or bulk processing.

