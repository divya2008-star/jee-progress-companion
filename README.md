# Momentum — JEE Study Operating System

> A premium, responsive study companion that helps JEE aspirants convert preparation into a clear, data-informed daily system.

**Momentum** is a laptop-first and mobile-responsive web application built for JEE preparation. It combines syllabus tracking, focused study planning, mock-test reflection, formula revision, sequential MCQ practice, and authenticated AI guidance into one calm command centre.

**Live demo:** [jeepdash-xjewxvct.manus.space](https://jeepdash-xjewxvct.manus.space)

## Why Momentum

JEE preparation creates a high volume of information: chapters to cover, formulas to revise, mock-test mistakes to understand, and limited study time to protect. Momentum turns those signals into a practical next step, while keeping the student in control of their plan and progress.

## Core capabilities

| Area | What Momentum provides |
| --- | --- |
| **Today command centre** | A daily priority view, editable study blocks, a revision queue, retrieval prompts, and Focus Mode. |
| **Syllabus mastery** | Tracking across 54 Physics, Chemistry, and Mathematics chapters using four meaningful study stages, plus notes, stars, and flags. |
| **Mock intelligence** | Persistent mock logging, score trends, subject signals, marks-loss analysis, and evidence-first post-mortem reflection. |
| **Formula revision** | Chapter-aware flashcards with known/shaky status and spaced-repetition review buckets. |
| **Practice Studio** | Server-generated, validated MCQs delivered one question at a time, with four choices, immediate correct/incorrect feedback, explanations, and gated progression. |
| **JEE Copilot** | Authenticated, student-specific guidance that draws on stored chapters, sessions, mock records, focus reflections, and flashcard reviews. |
| **Exam planning** | A selectable January 2027 target date (21, 22, 23, 24, or 28 January) that updates preparation countdowns and recommendations. |

## Experience and design

Momentum uses a dark, editorial, neon-academic visual language: ink backgrounds, electric-lime actions, carefully restrained cyan and magenta highlights, readable rounded panels, and purposeful interaction. The **Make Today Count** hero includes a pointer-following colour lens and subtle hover lift on supported desktop devices, with an accessible high-contrast mobile fallback.

## Technology

| Layer | Tools |
| --- | --- |
| Front end | React 19, Vite, TypeScript, Tailwind CSS 4, Radix UI, Recharts, Lucide icons |
| Backend | Node.js, Express 4, tRPC 11, Zod |
| Data | Drizzle ORM with MySQL/TiDB |
| Identity | Manus OAuth |
| AI | Secure server-side LLM integration with authenticated student context |
| Testing | Vitest |

## Run locally

### Prerequisites

Use **Node.js 22+** and **pnpm 10+**. The full authenticated experience also requires compatible database, OAuth, and server-side integration environment variables.

### Installation

```bash
git clone https://github.com/divya2008-star/jee-progress-companion.git
cd jee-progress-companion
pnpm install
pnpm dev
```

The development server runs through the application’s Node entry point. Open the local URL printed in the terminal.

### Useful commands

```bash
pnpm check    # TypeScript validation
pnpm test     # Vitest test suite
pnpm build    # Production build
pnpm start    # Serve the production build
```

## Security and data handling

AI requests are executed server-side, and context is assembled only from the authenticated student’s saved study data. API credentials are not stored in this repository. Do not commit `.env` files or production credentials when deploying your own version.

## Hackathon story

Momentum is designed as an education hackathon prototype that moves beyond a generic checklist. It gives students a visible preparation rhythm: understand the syllabus state, work the highest-value block, learn from mock evidence, revisit the right formulas, and then repeat.

## License

The project is declared under the MIT license in its package metadata.
