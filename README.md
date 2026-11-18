# RVUNL CBT Exam App

An offline Windows desktop mock-exam application for the RVUNL Junior Assistant / Commercial Assistant-II Phase-I pre-examination pattern.

## Included features

- Dedicated local profiles for **Monika** and **Shivani**, plus admin-created student profiles with optional hashed 4-digit PINs
- PIN-protected Admin Settings for resetting any profile or all result history
- Admin-only user creation, custom-user deletion, paper management, and PIN changes
- Backup/restore for profiles, results, PIN hashes, bookmarks, typing history, and imported papers
- Result export to Excel-compatible CSV and printable PDF
- One built-in bilingual 70-question, 100-mark mock paper
- Strict 60-minute timer with automatic submission
- Authentic five-option CBT controls and question palette statuses
- English/Hindi question switching and optional strict omnibus mode
- Official Phase-I no-negative-marking default, plus optional ¼ negative marking
- Keyboard shortcuts: `1`–`5`, `Enter`, and `M`
- Scorecard with subject-wise marks, accuracy, speed, and attempt history
- Detailed correct, wrong, and skipped answer review with bilingual explanations
- Per-profile Mistake Bank mini-tests
- Per-profile score trends, streaks, bookmarks, weak-subject practice, and typing history
- Offline multi-file JSON, Excel (`.xlsx`), CSV, and ZIP paper import with a downloadable CSV template
- Paper category, difficulty, and year filters
- Per-profile green completion indicators on attempted papers
- In-app update checks, background download progress, and restart-to-install for the NSIS installer
- Windows NSIS installer and portable executable builds

The core exam and all saved data work offline. The optional software-update check connects only to this repository's public GitHub Releases feed.

## Exam pattern

| Subject | Questions | Marks each | Total |
|---|---:|---:|---:|
| Rajasthan GK | 23 | 2 | 46 |
| World, India & Everyday Science | 7 | 2 | 14 |
| Reasoning & Mental Ability | 10 | 1 | 10 |
| Hindi General | 10 | 1 | 10 |
| English General | 10 | 1 | 10 |
| Mathematics | 10 | 1 | 10 |
| **Total** | **70** |  | **100** |

## Local development

Requirements: Node.js 22 and npm.

```bash
npm ci
npm run dev
```

Run a production type-check and build:

```bash
npm run build
```

Package the Windows installer and portable executable on Windows:

```bash
npm run package:win
```

Output files are written to `release/`.

## Importing papers

The admin importer accepts multiple `.json`, `.xlsx`, `.csv`, and `.zip` files in one selection. Every imported paper must contain exactly 70 questions totaling 100 marks. Invalid files are reported separately and do not block valid files in the same selection.

JSON papers follow the shape of [`src/data/sample_paper_01.json`](src/data/sample_paper_01.json).

Spreadsheet files use the first worksheet and these headers:

```text
id, subject, marks, question_en, question_hi,
option_a_en, option_b_en, option_c_en, option_d_en, option_e_en,
option_a_hi, option_b_hi, option_c_hi, option_d_hi, option_e_hi,
correctIndex, explanation_en, explanation_hi
```

`correctIndex` may be `0`–`4` or `A`–`E`. Subject names must exactly match the six labels in the exam-pattern table.

## Windows releases and automatic updates

The workflow in [`.github/workflows/build-windows.yml`](.github/workflows/build-windows.yml) builds Windows artifacts on branch pushes and manual dispatches. A tag that matches the version in `package.json` (for example `v2.0.0`) publishes the installer, portable executable, blockmap, and `latest.yml` to GitHub Releases. The Windows build also uploads these files to Actions as `RVUNL-CBT-Mock-App-Windows`.

The installed NSIS edition can check, download, and install a newer release from the dashboard. The portable edition can check its current version in Settings. Download new portable builds from GitHub Releases.

## Phase-II typing practice

Choose English, Hindi Unicode/Mangal, or Hindi Kruti Dev and a 5-, 10-, or 15-minute timer. Kruti Dev mode uses the locally installed Kruti Dev 010 font with the English keyboard layout.

## Privacy and exam integrity

The live exam UI never reveals correctness, correct answers, or explanations. Those details appear only after submission. Local PINs are salted and hashed in the packaged desktop app; they are intended for profile separation on a shared computer, not high-security authentication.


## Topic practice and exam controls

Open **Practice** to combine topics, choose question counts and difficulty, and save the setup as a preset. Search in Hindi or English to select individual questions for a timed test. Topic availability counts use unique questions. The syllabus checklist and practice goals are stored per profile on this device. Goal progress counts completed attempts after the goal is set.

Papers can supply optional question-level metadata. JSON questions accept `topic`, `difficulty` (Easy, Medium, Hard), `source` (with `title` and optional `year`), and `optionExplanations_en` / `optionExplanations_hi` arrays in A–E order. In CSV/XLSX, use `topic`, `difficulty`, `source`, `year`, and columns like `explanation_a_hi`. Existing papers use text-based topic matching and paper-level difficulty when question metadata is absent. The importer reports repeated questions and preserves the original paper.

The optional **Save & Next** mode saves a selection when you use Save & Next, Save answer on the last question, or Mark for Review & Next. Opening another question directly discards an unsaved selection. The full-paper view and final submission checklist show only exam content and response status. Option explanations and the result of guessed answers appear in post-exam review.


**Subject-wise tests** draw 50 distinct questions for the selected subject and allow 50 minutes. The app includes an offline practice bank across all six subjects, plus any imported questions. Rajasthan landmark facts use the [Rajasthan Tourism destination guides](https://www.tourism.rajasthan.gov.in/tourist-destinations.html). Element symbols follow the [IUPAC periodic table](https://iupac.org/what-we-do/periodic-table-of-elements/).

Use **Save & return to dashboard** during a paper to pause it. Resume it from the dashboard with your saved answers and remaining time. Today's total combines the earned and possible marks from every completed attempt on this profile. History lets you view the total for an earlier date.
