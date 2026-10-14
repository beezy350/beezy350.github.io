# Default skill routing

Project skills live in `.claude/skills/` and load automatically in every session on this repo.
When a request matches a row below, invoke that skill first, without being asked.

| When I ask to… | Use skill | Source |
|---|---|---|
| Find the best skill for a task / "is there a skill for X" | `find-skills` | vercel-labs/skills |
| Study a website, screenshot it, explain why its layout works, test a page in a browser | `playwright-cli` | microsoft/playwright-cli |
| Design UI/UX, pick styles, palettes, font pairings, build a design system | `ui-ux-pro-max` | nextlevelbuilder/ui-ux-pro-max-skill |
| Build or restyle a frontend so it looks premium, not generic AI | `design-taste-frontend` (folder `taste-skill`) | Leonxlnx/taste-skill |
| Write or rewrite landing page, homepage, sales or content copy, headlines, CTAs | `copywriting` | coreyhaines31/marketingskills |
| Edit, tighten, proofread or review existing copy | `copy-editing` | coreyhaines31/marketingskills |
| Set up or update my audience, offer and positioning context | `product-marketing` | coreyhaines31/marketingskills |
| Make a PDF (giveaway, lead magnet, branded document), or read/merge/fill a PDF | `pdf` | anthropics/skills |
| Turn notes into a Word guide / .docx | `docx` | anthropics/skills |
| Turn a post into slides or an Instagram carousel / .pptx | `pptx` | anthropics/skills |
| Design a cover, poster or visual (e.g. black, gold and cream guide cover) | `canvas-design` | anthropics/skills |
| Build a new skill (e.g. captions in my brand voice) or improve one | `skill-creator` | anthropics/skills |

## Defaults
- Copy skills read `.agents/product-marketing.md` for brand context. If it does not exist, run `product-marketing` once to create it, then reuse it.
- Brand palette for giveaways and covers unless told otherwise: black, gold, cream.
- Instagram carousels: 1080x1350 portrait slides, one idea per slide, hook on slide 1, CTA on the last.
- Deliverables (PDFs, decks, covers, docs) go in `deliverables/`.
- Combine skills when a task spans them: e.g. a free guide = `copywriting` → `docx` or `pdf` → `canvas-design` cover.
