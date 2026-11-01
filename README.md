# Questionnaire website

A small static questionnaire website using HTML, CSS, JavaScript, and a JSON question file.

## Files

- `index.html` — page structure
- `style.css` — appearance and responsive layout
- `script.js` — question loading, random order, duplicate handling, answers, and scoring
- `data/questions.json` — editable question data

## Run locally

Because the page loads JSON with `fetch()`, open it through a local web server rather than double-clicking `index.html`.

From this folder, run:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Add fields and questions

Edit `data/questions.json` and follow this structure:

```json
[
    {
        "name": "business",
        "questions": [
            "I enjoy organizing people and projects to reach a goal."
        ]
    },
    {
        "name": "leadership",
        "questions": [
            "I enjoy organizing people and projects to reach a goal.",
            "I am comfortable helping a group make a decision."
        ]
    }
]
```

A question that appears in more than one field is shown only once. Its answer is counted toward every field containing that question. Duplicate detection ignores capitalization and repeated/leading/trailing whitespace.

## Random order

Questions are shuffled randomly. The ordering algorithm chooses randomly among the remaining questions that do not share a field with the previous question. If no such question remains, it chooses randomly from all remaining questions. This avoids consecutive questions from the same field whenever the available question set makes that possible, without using a predictable field rotation.

## Scoring

- Strongly agree: 100
- Agree: 75
- Somewhat agree: 50
- Disagree: 25
- Strongly disagree: 0

Each field percentage is the arithmetic mean of the scores for its unique questions. A shared question contributes its answer to each field it belongs to. A field with no questions displays `N/A`.

## Important

This is a static client-side website. The question JSON is loaded by the browser, so visitors can inspect it. The questionnaire UI does not provide controls for editing the question data. As with any client-side website, someone using browser developer tools can alter their own local page state; this does not modify your original JSON file.
