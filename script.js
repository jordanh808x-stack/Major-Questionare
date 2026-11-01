const ANSWER_OPTIONS = [
    { label: "Strongly agree", score: 100 },
    { label: "Agree", score: 75 },
    { label: "Somewhat agree", score: 50 },
    { label: "Disagree", score: 25 },
    { label: "Strongly disagree", score: 0 }
];

const elements = {
    startScreen: document.getElementById("start-screen"),
    questionScreen: document.getElementById("question-screen"),
    resultsScreen: document.getElementById("results-screen"),
    startButton: document.getElementById("start-button"),
    backButton: document.getElementById("back-button"),
    nextButton: document.getElementById("next-button"),
    restartButton: document.getElementById("restart-button"),
    progressText: document.getElementById("progress-text"),
    progressTrack: document.getElementById("progress-track"),
    progressFill: document.getElementById("progress-fill"),
    fieldHint: document.getElementById("field-hint"),
    questionText: document.getElementById("question-text"),
    answerOptions: document.getElementById("answer-options"),
    resultsList: document.getElementById("results-list"),
    statusMessage: document.getElementById("status-message")
};

let fields = [];
let questions = [];
let currentQuestionIndex = 0;
let answers = new Map();

elements.startButton.addEventListener("click", startQuestionnaire);
elements.backButton.addEventListener("click", showPreviousQuestion);
elements.nextButton.addEventListener("click", continueQuestionnaire);
elements.restartButton.addEventListener("click", restartQuestionnaire);

// Loads the question data when the page opens.
async function loadQuestionData() {
    try {
        const response = await fetch("data/questions.json");

        if (!response.ok) {
            throw new Error(`Could not load questions.json (${response.status}).`);
        }

        const loadedFields = await response.json();
        validateFields(loadedFields);

        fields = loadedFields;
        questions = createUniqueQuestions(fields);

        if (questions.length === 0) {
            throw new Error("The question file does not contain any questions.");
        }

        elements.startButton.disabled = false;
        elements.statusMessage.textContent = `${questions.length} questions ready.`;
    } catch (error) {
        elements.startButton.disabled = true;
        elements.statusMessage.textContent = error.message;
        console.error(error);
    }
}

// Checks that the JSON has the expected fields and question lists.
function validateFields(data) {
    if (!Array.isArray(data)) {
        throw new Error("The question file must contain a list of fields.");
    }

    data.forEach((field, index) => {
        if (!field || typeof field.name !== "string" || !field.name.trim()) {
            throw new Error(`Field ${index + 1} needs a valid name.`);
        }

        if (!Array.isArray(field.questions)) {
            throw new Error(`The "${field.name}" field needs a questions list.`);
        }

        if (!field.questions.every(question =>
            typeof question === "string" && question.trim()
        )) {
            throw new Error(`Every question in "${field.name}" must be non-empty text.`);
        }
    });
}

// Normalizes question text so spacing and capitalization differences count as duplicates.
function normalizeQuestion(questionText) {
    return questionText.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

// Combines identical questions and remembers every field they belong to.
function createUniqueQuestions(fieldData) {
    const questionGroups = new Map();

    fieldData.forEach(field => {
        field.questions.forEach(questionText => {
            const normalizedText = normalizeQuestion(questionText);

            if (!questionGroups.has(normalizedText)) {
                questionGroups.set(normalizedText, {
                    text: questionText.trim(),
                    fields: []
                });
            }

            const questionGroup = questionGroups.get(normalizedText);

            if (!questionGroup.fields.includes(field.name)) {
                questionGroup.fields.push(field.name);
            }
        });
    });

    return Array.from(questionGroups.values());
}

// Randomly shuffles an array using the Fisher-Yates algorithm.
function shuffleArray(items) {
    const shuffledItems = [...items];

    for (let index = shuffledItems.length - 1; index > 0; index--) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [shuffledItems[index], shuffledItems[randomIndex]] =
            [shuffledItems[randomIndex], shuffledItems[index]];
    }

    return shuffledItems;
}

// Creates a random order while avoiding consecutive questions that share a field when possible.
function createQuestionOrder(questionGroups) {
    const remainingQuestions = shuffleArray(questionGroups);
    const orderedQuestions = [];

    while (remainingQuestions.length > 0) {
        const previousQuestion = orderedQuestions[orderedQuestions.length - 1];

        let eligibleIndexes = remainingQuestions
            .map((question, index) => ({ question, index }))
            .filter(item => !previousQuestion ||
                !sharesAField(previousQuestion, item.question));

        // If every remaining question shares a field with the previous one,
        // allow a repeat rather than getting stuck.
        if (eligibleIndexes.length === 0) {
            eligibleIndexes = remainingQuestions.map((question, index) => ({
                question,
                index
            }));
        }

        const selectedPosition = Math.floor(Math.random() * eligibleIndexes.length);
        const selectedIndex = eligibleIndexes[selectedPosition].index;

        orderedQuestions.push(remainingQuestions.splice(selectedIndex, 1)[0]);
    }

    return orderedQuestions;
}

// Checks whether two questions belong to at least one common field.
function sharesAField(firstQuestion, secondQuestion) {
    return firstQuestion.fields.some(fieldName =>
        secondQuestion.fields.includes(fieldName)
    );
}

// Starts a new questionnaire session.
function startQuestionnaire() {
    answers = new Map();
    questions = createQuestionOrder(createUniqueQuestions(fields));
    currentQuestionIndex = 0;

    showScreen("question");
    displayCurrentQuestion();
}

// Displays the current question and its saved answer, if any.
function displayCurrentQuestion() {
    const question = questions[currentQuestionIndex];
    const questionNumber = currentQuestionIndex + 1;
    const progress = (questionNumber / questions.length) * 100;

    elements.progressText.textContent =
        `Question ${questionNumber} of ${questions.length}`;
    elements.progressFill.style.width = `${progress}%`;
    elements.progressTrack.setAttribute("aria-valuenow", String(Math.round(progress)));

    elements.fieldHint.textContent = question.fields.length > 1
        ? `Applies to: ${question.fields.join(", ")}`
        : question.fields[0];

    elements.questionText.textContent = question.text;
    elements.backButton.disabled = currentQuestionIndex === 0;
    elements.nextButton.textContent =
        currentQuestionIndex === questions.length - 1 ? "Finish" : "Next";

    displayAnswerOptions(question);
    updateNextButton();
}

// Creates the five answer choices for the current question.
function displayAnswerOptions(question) {
    elements.answerOptions.replaceChildren();

    ANSWER_OPTIONS.forEach((option, optionIndex) => {
        const label = document.createElement("label");
        label.className = "answer-option";

        const input = document.createElement("input");
        input.type = "radio";
        input.name = "question-answer";
        input.value = String(optionIndex);
        input.checked = answers.get(question.text) === optionIndex;
        input.addEventListener("change", () => {
            answers.set(question.text, optionIndex);
            updateNextButton();
        });

        const text = document.createElement("span");
        text.textContent = option.label;

        label.append(input, text);
        elements.answerOptions.append(label);
    });
}

// Enables Next only after an answer has been selected.
function updateNextButton() {
    const currentQuestion = questions[currentQuestionIndex];
    elements.nextButton.disabled = !answers.has(currentQuestion.text);
}

// Moves to the previous question.
function showPreviousQuestion() {
    if (currentQuestionIndex === 0) {
        return;
    }

    currentQuestionIndex--;
    displayCurrentQuestion();
}

// Moves forward or calculates the results after the final question.
function continueQuestionnaire() {
    const currentQuestion = questions[currentQuestionIndex];

    if (!answers.has(currentQuestion.text)) {
        return;
    }

    if (currentQuestionIndex === questions.length - 1) {
        displayResults();
        return;
    }

    currentQuestionIndex++;
    displayCurrentQuestion();
}

// Calculates the average score for every field.
function calculateFieldResults() {
    return fields.map(field => {
        const fieldQuestions = questions.filter(question =>
            question.fields.includes(field.name)
        );

        const totalScore = fieldQuestions.reduce((total, question) => {
            const selectedOption = ANSWER_OPTIONS[answers.get(question.text)];
            return total + selectedOption.score;
        }, 0);

        const percentage = fieldQuestions.length > 0
            ? totalScore / fieldQuestions.length
            : null;

        return {
            name: field.name,
            percentage,
            questionCount: fieldQuestions.length
        };
    });
}

// Displays the final field percentages.
function displayResults() {
    const results = calculateFieldResults()
        .sort((first, second) => {
            if (first.percentage === null) return 1;
            if (second.percentage === null) return -1;
            return second.percentage - first.percentage;
        });

    elements.resultsList.replaceChildren();

    results.forEach(result => {
        const item = document.createElement("article");
        item.className = "result-item";

        const heading = document.createElement("div");
        heading.className = "result-heading";

        const name = document.createElement("span");
        name.className = "result-name";
        name.textContent = result.name;

        const percentage = document.createElement("span");
        percentage.className = "result-percentage";
        percentage.textContent = result.percentage === null
            ? "N/A"
            : `${result.percentage.toFixed(1)}%`;

        heading.append(name, percentage);
        item.append(heading);

        if (result.percentage !== null) {
            const track = document.createElement("div");
            track.className = "result-track";
            track.setAttribute("aria-label", `${result.name}: ${result.percentage.toFixed(1)} percent`);

            const fill = document.createElement("div");
            fill.className = "result-fill";
            fill.style.width = `${result.percentage}%`;

            track.append(fill);
            item.append(track);
        }

        const detail = document.createElement("p");
        detail.className = "result-detail";
        detail.textContent = `${result.questionCount} question${result.questionCount === 1 ? "" : "s"} counted`;
        item.append(detail);

        elements.resultsList.append(item);
    });

    showScreen("results");
}

// Shows one application screen and hides the others.
function showScreen(screenName) {
    elements.startScreen.hidden = screenName !== "start";
    elements.questionScreen.hidden = screenName !== "question";
    elements.resultsScreen.hidden = screenName !== "results";
    elements.statusMessage.textContent = "";
}

// Resets the questionnaire so it can be taken again in a new random order.
function restartQuestionnaire() {
    answers = new Map();
    questions = createUniqueQuestions(fields);
    currentQuestionIndex = 0;
    showScreen("start");
}

loadQuestionData();
