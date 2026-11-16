# RVUNL CBT Exam App

An offline Windows desktop mock-exam application for the RVUNL Junior Assistant / Commercial Assistant-II Phase-I pre-examination pattern.

## Included features

- Dedicated local profiles for **Monika** and **Shivani**, plus admin-created student profiles with optional hashed 4-digit PINs
- PIN-protected Admin Settings for resetting any profile or all result history
- Admin-only user creation, custom-user deletion, paper management, and PIN changes
- Backup/restore for profiles, results, PIN hashes, and imported papers
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
- Monika/Shivani subject-accuracy comparison charts
- Offline multi-file JSON, Excel (`.xlsx`), and CSV paper import with a downloadable CSV template
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

Requirements: Node.js 20 and npm.

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

The admin importer accepts multiple `.json`, `.xlsx`, and `.csv` files in one selection. Every imported paper must contain exactly 70 questions totaling 100 marks. Invalid files are reported separately and do not block valid files in the same selection.

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

The workflow in [`.github/workflows/build-windows.yml`](.github/workflows/build-windows.yml) runs on every push to `main` and through manual dispatch. It uses the GitHub Actions run number as the patch version and packages both the installer and portable executable with code-signing auto-discovery disabled. The `.exe`, blockmap, and update metadata files are uploaded to the `RVUNL-CBT-Mock-App-Windows` Actions artifact.

Automatic GitHub Release publishing is intentionally separate from this build job. This prevents a release API error from discarding an otherwise successful Windows build. The installed NSIS edition can use its update button whenever a compatible GitHub Release and `latest.yml` are published; portable users must replace the portable executable manually.

## Privacy and exam integrity

The live exam UI never reveals correctness, correct answers, or explanations. Those details appear only after submission. Local PINs are salted and hashed in the packaged desktop app; they are intended for profile separation on a shared computer, not high-security authentication.
