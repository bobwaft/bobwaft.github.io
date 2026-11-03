---
name: add-project
description: Add a project to the portfolio's notebook (the Projects section) by asking the owner for every field with AskUserQuestion, then writing src/content/projects/<slug>.md and preparing its media in public/projects/. Use whenever the user wants to add, create or put a new project in the notebook or portfolio, says "add a project", "new project entry", "put X in my projects", or wants to replace a placeholder project with a real one — even if they only name the project and give no details.
---

# Add a project

Each project is one Markdown file in `src/content/projects/`, shown as one spread of the notebook. You collect the fields from the owner one at a time with `AskUserQuestion`, write the file, prepare any media, and run the content tests. Don't make up content: every field comes from the owner's answers (you may suggest options, but they choose).

## The format

`src/content/projects.ts` (`parseProject`) is the authority; re-read it if anything here seems out of date. Today:

```markdown
---
title: Desk Scene Portfolio
dates: 2025 – 2026
tags: three.js, blender, typescript
order: 1
links: Source=https://github.com/bobwaft/bobwaft.github.io, Live=https://bobwaft.github.io
media: /projects/desk-scene.webp
alt: The 3D desk with the notebook open on the projects page
---

First paragraph: what it is and why it was built.

Second paragraph: the outcome, the tools, what was learned.
```

Rules the parser enforces (break one and the site build or tests fail):

- Front matter is `key: value`, one line each. Values can't span lines.
- Required: `title`, `dates`, `tags`, `order`, and a non-empty body.
- `tags`: comma-separated, at least one, so a tag can't contain a comma.
- `order`: integer ≥ 1, unique across all projects (ascending = order in the contents).
- `links` (optional): comma-separated `Label=https://url`. Only `https://`. No commas in labels or URLs, no `=` in labels.
- `media` (optional): a path under `/projects/` ending `.webp` (image) or `.mp4` / `.webm` (looping clip). Size limits: image ≤ 300 KB, clip ≤ 3 MB. `alt` is required when `media` is set.
- Never add `phone` or `address` fields (privacy rule; the parser rejects them).
- 1–12 projects in total.

## 1. Look before asking

Read the existing files in `src/content/projects/` so you know the taken `order` values, the current count, and which entries are placeholders (title starts with "Placeholder" or the body starts with "PLACEHOLDER"). If the user already gave some details in their request, still confirm them through the questions (pre-fill them as the first option) rather than skipping the field.

## 2. Ask, one field per question

Use `AskUserQuestion`, at most 4 questions per call, in this order. Each question must stand on its own (the owner may only see the dialog), so name the field and give a short example of the format. Free-text answers arrive through the automatic "Other" choice, so for free-text fields offer 2–3 concrete suggestions or format examples as options and tell them to pick "Other" to type their own.

**Call 1: identity**
1. **Title:** the project's name as shown in the notebook. Options: suggestions from the request if any.
2. **Dates:** e.g. `2024`, `2024 – 2025`, `Spring 2025`, `2023 – present`. Use an en dash with spaces for ranges, matching the existing files.
3. **Tags:** comma-separated technologies or topics, e.g. `three.js, blender, typescript`. Remind them that a tag can't contain a comma.
4. **Placement:** where it goes in the contents. Options like "First (order 1, shift the others down)", "Last (order N)", "Replace placeholder: <title>" for each placeholder still present. If the notebook already has 12 projects and none are placeholders, say so and ask which one to replace or whether to stop.

**Call 2: links and media**
5. **Links:** label and https URL pairs, e.g. `Source=https://github.com/...`, `Live=https://...`, `Demo video=https://...`. Offer "No links" as an option.
6. **Media:** offer "An image (I'll give a file path)", "A short looping video clip (I'll give a file path)", "No media". If they choose image or clip, ask in a follow-up call for the **file path** on their computer and the **alt text** (one sentence describing what's in it, for screen readers).

**Call 3: the write-up**
7. **Summary:** the body text, 1–3 short paragraphs (the right page holds about 120–180 words before it scrolls). Offer options "I'll write it (pick Other)" and "Draft it from what I tell you". If they want a draft, ask what it does, why they built it and what came of it (one question each), then write it in their plain first-person voice and show it back in an `AskUserQuestion` with "Use this", "Shorter", "Let me edit (Other)".

Validate each answer against the rules above as it comes in. If one breaks a rule (an `http://` link, a comma in a tag, a duplicate order), explain the problem in one line and ask that question again; don't silently fix it, except for trimming whitespace.

## 3. Prepare the media

Copy the owner's file into `public/projects/<slug>.<ext>`, converting when needed. ffmpeg is installed (on PATH in Git Bash).

- **Image** (any format) → WebP, max 1200 px on the long side:
  `ffmpeg -y -i "<src>" -vf "scale='min(1200,iw)':-2" -c:v libwebp -quality 80 public/projects/<slug>.webp`
  If it's over 300 KB, retry with `-quality 65`, then with width 900.
- **Clip** → MP4, H.264, no audio, ≤ 720 px wide, so it autoplays muted on every browser:
  `ffmpeg -y -i "<src>" -an -vf "scale='min(720,iw)':-2" -c:v libx264 -preset slow -crf 28 -pix_fmt yuv420p -movflags +faststart public/projects/<slug>.mp4`
  If it's over 3 MB, raise `-crf` by 3 and retry; if that's not enough, ask the owner whether to trim it (`-t <seconds>`) or drop the frame rate (`-r 24`).

Check the final size with `ls -l` and tell the owner what it came to.

## 4. Write the file

- **Slug:** the title in lowercase kebab-case (`Desk Scene Portfolio` → `desk-scene-portfolio`). If that file exists, ask before overwriting.
- Replacing a placeholder: delete the placeholder's `.md` and its media in `public/projects/` (only media no other project uses), and take its `order`.
- Inserting at a taken `order`: bump the `order` of every project at or after it by one, so the values stay unique.
- Field order in the front matter as in the example. Omit `links`, `media` and `alt` entirely when unused.

## 5. Check

Run `npx vitest run tests/content/projects.test.ts`. It parses every project, checks unique orders, and checks that media exist and are within the size limits. Fix any failure, then tell the owner:

- the file written and the media path and size,
- any other projects whose `order` changed or that were removed,
- to run `npm run dev`, click the notebook and check the new spread. The summary scrolls if it's too long for the page; suggest trimming if it does.

Don't commit unless they ask.
