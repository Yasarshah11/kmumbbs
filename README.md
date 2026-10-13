# Medico Healer

Offline-first study app for First Year MBBS (KMU), built from a private folder of course resources.

## Layout

| Folder | What it holds |
|---|---|
| `app/` | The web app. Static files only; this is the folder that gets hosted. |
| `tools/` | The pipeline that turns the PDFs into the app's data. |
| `data/` | Pipeline outputs: extracted text, OCR text, answer keys, link lists. |
| `data/access-code.txt` | The current access code (never published). |

## Preview on this computer

```
cd tools
node serve.mjs          # then open http://localhost:4173
```

## Rebuilding the data

Run from `tools/` after changing sources, keys or the curriculum:

```
node parse.mjs ../data ../data/questions.raw.json --report   # text -> question bank
node build.mjs                                               # question bank + curriculum -> app/data
node shots.mjs <folder>                                      # smoke test (needs serve.mjs running)
```

- `mklist.mjs` builds `data/manifest.json` from extracted PDFs and dumps text-layer PDFs to `data/text/`.
- `ocr.mjs` reads scanned PDFs with Tesseract into `data/ocr/`. Flags: `--rotate` straightens sideways photos, `--psm=N`, `--width=N`.
- `data/keys.json` holds answer keys added for papers that came unsolved (`X` drops a damaged question, `?` marks one left unkeyed on purpose). `dump.mjs` lists unkeyed questions and `addkeys.mjs` merges new keys.
- `curriculum.mjs` is the study map. Later years go in as new entries in `YEARS`.
- `taxonomy.mjs` holds the module/subject keyword classifier and the MCQ weights.

## Answer keys

Keys come from two places: the source paper itself (clean text sources only), or `data/keys.json`.
Keys printed in scanned papers are not read automatically, because OCR can attach them to the wrong question.
The app labels keys from `keys.json` as suggested so they can be checked against the book.

## Access code

The app asks for an access code, and its data is encrypted with that code, so the public site holds no readable questions.
To change the code and publish the change:

```
cd tools
node setcode.mjs NEW-CODE --push
```

Everyone on the old code is asked for the new one the next time the app updates on their phone (it needs to be opened online once or twice).
Only `app/`, `tools/` and this file are published; `data/` and the source archives stay on this computer.
