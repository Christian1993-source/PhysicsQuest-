const STORAGE_KEY = "physicsQuestHub.state.v1";
const LEGACY_STORAGE_KEY = "physicsQuestHub.reviews.v1";
const GITHUB_SYNC_KEY = "physicsQuestHub.githubSync.v1";
const PUBLISHED_FILE_PATH = "questions.json";
const GITHUB_API_BASE = "https://api.github.com";
const TEACHER_PASSWORD = "tutorias2026";
const LEGACY_KEYS = {
  reviews: "chemPrepMyp.reviews.v1",
  bank: "chemPrepMyp.bank.v1",
  overview: "chemPrepMyp.overview.v1"
};

const LETTERS = ["A", "B", "C", "D"];
const DEFAULT_QUIZ_SECONDS = 45 * 60;

const state = {
  reviews: [],
  updatedAt: null,
  selectedReview: null,
  quiz: null,
  isAdmin: false,
  editingId: null,
  sync: {
    token: "",
    repo: null,
    busy: false,
    status: "",
    tone: "neutral"
  }
};

const studentViews = document.querySelectorAll("[data-student-view]");
const adminViews = document.querySelectorAll("[data-admin-view]");

const teacherAdminBtn = document.getElementById("teacherAdminBtn");
const reviewGrid = document.getElementById("reviewGrid");

const quizView = document.getElementById("quizView");
const resultsView = document.getElementById("resultsView");
const adminDashboard = document.getElementById("adminDashboard");
const adminEditor = document.getElementById("adminEditor");

const timerDisplay = document.getElementById("timerDisplay");
const progressDisplay = document.getElementById("progressDisplay");
const scoreDisplay = document.getElementById("scoreDisplay");
const reviewTitleBadge = document.getElementById("reviewTitleBadge");
const questionText = document.getElementById("questionText");
const hintBtn = document.getElementById("hintBtn");
const hintBox = document.getElementById("hintBox");
const optionsGrid = document.getElementById("optionsGrid");
const feedbackText = document.getElementById("feedbackText");
const continueBtn = document.getElementById("continueBtn");
const homeBtnQuiz = document.getElementById("homeBtnQuiz");
const questionNav = document.getElementById("questionNav");

const resultsTitle = document.getElementById("resultsTitle");
const finalScore = document.getElementById("finalScore");
const finalPercent = document.getElementById("finalPercent");
const finalMessage = document.getElementById("finalMessage");
const retryBtn = document.getElementById("retryBtn");
const backHomeBtn = document.getElementById("backHomeBtn");

const createReviewBtn = document.getElementById("createReviewBtn");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importInput = document.getElementById("importInput");
const clearLocalBtn = document.getElementById("clearLocalBtn");
const adminList = document.getElementById("adminList");
const syncRepoValue = document.getElementById("syncRepoValue");
const githubTokenInput = document.getElementById("githubTokenInput");
const saveSyncBtn = document.getElementById("saveSyncBtn");
const publishNowBtn = document.getElementById("publishNowBtn");
const syncStatus = document.getElementById("syncStatus");

const editorTitle = document.getElementById("editorTitle");
const editorForm = document.getElementById("editorForm");
const titleInput = document.getElementById("titleInput");
const questionsInput = document.getElementById("questionsInput");
const parseErrors = document.getElementById("parseErrors");
const cancelEditorBtn = document.getElementById("cancelEditorBtn");

function showStudentView(viewId) {
  studentViews.forEach((view) => {
    view.classList.toggle("is-active", view.id === viewId);
  });
  adminViews.forEach((view) => {
    view.classList.remove("is-active");
  });
}

function showAdminView(viewId) {
  adminViews.forEach((view) => {
    view.classList.toggle("is-active", view.id === viewId);
  });
  studentViews.forEach((view) => {
    view.classList.remove("is-active");
  });
}

function updateTeacherButton() {
  teacherAdminBtn.textContent = state.isAdmin ? "Back to Student" : "Teacher Admin";
}

function requestTeacherAccess() {
  const enteredPassword = window.prompt("Enter the teacher password:");
  if (enteredPassword === null) {
    return false;
  }

  if (enteredPassword !== TEACHER_PASSWORD) {
    window.alert("Incorrect teacher password.");
    return false;
  }

  return true;
}

function makeEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function generateId(prefix = "review") {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function shuffleArray(items) {
  const clone = [...items];
  for (let index = clone.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
  }
  return clone;
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function looksLikeQuestion(rawValue) {
  return Boolean(
    rawValue &&
    typeof rawValue === "object" &&
    (
      typeof rawValue.questionText === "string" ||
      typeof rawValue.prompt === "string" ||
      Array.isArray(rawValue.choices) ||
      rawValue.correctIndex !== undefined ||
      rawValue.answer !== undefined ||
      rawValue.numericAnswer !== undefined
    )
  );
}

function parseStatePayload(rawValue) {
  if (Array.isArray(rawValue)) {
    if (!rawValue.length) {
      return {
        updatedAt: null,
        reviews: []
      };
    }

    if (looksLikeQuestion(rawValue[0])) {
      return {
        updatedAt: null,
        reviews: [{
          id: "review-default",
          title: "Physics Review",
          questions: rawValue
        }]
      };
    }

    return {
      updatedAt: null,
      reviews: rawValue
    };
  }

  if (rawValue && typeof rawValue === "object" && Array.isArray(rawValue.reviews)) {
    return {
      updatedAt: typeof rawValue.updatedAt === "string" ? rawValue.updatedAt : null,
      reviews: rawValue.reviews
    };
  }

  if (
    rawValue &&
    typeof rawValue === "object" &&
    (typeof rawValue.title === "string" || Array.isArray(rawValue.questions) || Array.isArray(rawValue.bank))
  ) {
    return {
      updatedAt: null,
      reviews: [rawValue]
    };
  }

  return null;
}

function getStatePayload() {
  return {
    updatedAt: state.updatedAt,
    reviews: state.reviews
  };
}

function touchUpdatedAt() {
  state.updatedAt = new Date().toISOString();
}

function isTimestampNewer(left, right) {
  const leftTime = Date.parse(left || "");
  const rightTime = Date.parse(right || "");

  if (!Number.isFinite(leftTime)) return false;
  if (!Number.isFinite(rightTime)) return true;
  return leftTime > rightTime;
}

function encodeGitHubPath(value) {
  return String(value || "")
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function utf8ToBase64(value) {
  const bytes = new TextEncoder().encode(String(value || ""));
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToUtf8(value) {
  const binary = atob(String(value || ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function detectGitHubRepo() {
  const host = String(window.location.hostname || "").toLowerCase();
  if (!host.endsWith(".github.io")) {
    return null;
  }

  const owner = host.replace(/\.github\.io$/, "");
  const parts = String(window.location.pathname || "")
    .split("/")
    .filter(Boolean);
  const repo = parts.length ? parts[0] : `${owner}.github.io`;

  return { owner, repo };
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "physics-review";
}

function parseLineList(value) {
  return String(value || "")
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeFreeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9.+/\-]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function extractFirstNumber(value) {
  const match = String(value || "").match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/i);
  return match ? Number(match[0]) : null;
}

function inferTopic(prompt) {
  const text = String(prompt || "").toLowerCase();
  if (/(speed|velocity|distance|displacement|time|acceleration|motion|position)/.test(text)) return "Motion";
  if (/(force|newton|friction|gravity|mass|weight|resultant|balanced|unbalanced)/.test(text)) return "Forces";
  if (/(energy|kinetic|potential|work done|power|efficiency|transfer|store)/.test(text)) return "Energy";
  if (/(wave|frequency|wavelength|amplitude|sound|light|electromagnetic)/.test(text)) return "Waves";
  if (/(current|voltage|resistance|circuit|series|parallel|charge|electric)/.test(text)) return "Electricity";
  if (/(pressure|density|upthrust|fluid|float|sink|gas pressure)/.test(text)) return "Matter and pressure";
  return "Physics";
}

function defaultHintFor(question) {
  const topic = question.topic || inferTopic(question.questionText || question.prompt);
  if (question.type === "numeric") {
    return "Write the equation first, then substitute values carefully.";
  }
  if (topic === "Motion") return "Look for the relationship between distance, time, speed, and acceleration.";
  if (topic === "Forces") return "Think about the net force acting on the object.";
  if (topic === "Energy") return "Identify the energy store or transfer involved.";
  if (topic === "Waves") return "Focus on amplitude, frequency, or wavelength.";
  if (topic === "Electricity") return "Use the link between current, voltage, and resistance.";
  if (topic === "Matter and pressure") return "Think about density, pressure, and fluid behavior.";
  return "Look for the main physics idea in the question stem.";
}

function normalizeQuestion(rawQuestion, index = 0) {
  if (!rawQuestion || typeof rawQuestion !== "object") return null;

  const questionText = String(rawQuestion.questionText || rawQuestion.prompt || "").trim();
  if (!questionText) return null;

  const topic = String(rawQuestion.topic || inferTopic(questionText)).trim() || "Physics";
  const hint = String(rawQuestion.hint || defaultHintFor({ questionText, topic, type: rawQuestion.type })).trim();
  const id = String(rawQuestion.id || `question-${slugify(topic)}-${slugify(questionText)}-${index + 1}`);

  if (rawQuestion.type === "mc" || Array.isArray(rawQuestion.choices)) {
    let choices = [];
    let correctIndex = -1;

    if (
      Array.isArray(rawQuestion.choices) &&
      rawQuestion.choices.every((choice) => typeof choice === "string") &&
      Number.isInteger(rawQuestion.correctIndex)
    ) {
      choices = rawQuestion.choices.map((choice) => String(choice).trim());
      correctIndex = rawQuestion.correctIndex;
    } else if (
      Array.isArray(rawQuestion.choices) &&
      rawQuestion.choices.every((choice) => choice && typeof choice === "object" && typeof choice.text === "string")
    ) {
      choices = rawQuestion.choices.map((choice) => String(choice.text).trim());
      correctIndex = rawQuestion.choices.findIndex((choice) => Boolean(choice.isCorrect));
    }

    if (choices.length !== 4 || correctIndex < 0 || correctIndex > 3 || choices.some((choice) => !choice)) {
      return null;
    }

    return {
      id,
      type: "mc",
      questionText,
      topic,
      hint,
      choices,
      correctIndex
    };
  }

  if (rawQuestion.type === "numeric" || rawQuestion.tolerance !== undefined || typeof rawQuestion.answer === "number") {
    const answer = Number(rawQuestion.answer ?? rawQuestion.numericAnswer);
    const tolerance = Math.abs(Number(rawQuestion.tolerance ?? 0));
    if (!Number.isFinite(answer) || !Number.isFinite(tolerance)) return null;

    return {
      id,
      type: "numeric",
      questionText,
      topic,
      hint,
      answer,
      tolerance
    };
  }

  const answers = Array.isArray(rawQuestion.answers)
    ? rawQuestion.answers.map((answer) => String(answer).trim()).filter(Boolean)
    : String(rawQuestion.answer || "")
        .split("|")
        .map((answer) => answer.trim())
        .filter(Boolean);

  if (!answers.length) return null;

  return {
    id,
    type: "fill",
    questionText,
    topic,
    hint,
    answers
  };
}

function normalizeReview(rawReview, index = 0) {
  if (!rawReview || typeof rawReview !== "object") return null;

  const title = String(rawReview.title || rawReview.unitName || `Physics Review ${index + 1}`).trim();
  const questions = Array.isArray(rawReview.questions)
    ? rawReview.questions.map((question, questionIndex) => normalizeQuestion(question, questionIndex)).filter(Boolean)
    : Array.isArray(rawReview.bank)
      ? rawReview.bank.map((question, questionIndex) => normalizeQuestion(question, questionIndex)).filter(Boolean)
      : [];
  const explicitTopics = Array.isArray(rawReview.topics) ? rawReview.topics.map((topic) => String(topic).trim()).filter(Boolean) : [];
  const derivedTopics = Array.from(new Set(questions.map((question) => question.topic).filter(Boolean)));

  return {
    id: String(rawReview.id || generateId("review")).trim(),
    title: title || `Physics Review ${index + 1}`,
    topics: explicitTopics.length ? explicitTopics : derivedTopics,
    questions
  };
}

function migrateLegacyReviews() {
  const migrated = [];

  try {
    const rawLegacyReviews = JSON.parse(localStorage.getItem(LEGACY_KEYS.reviews) || "null");
    if (Array.isArray(rawLegacyReviews)) {
      rawLegacyReviews.forEach((review, index) => {
        const normalized = normalizeReview(review, index);
        if (normalized) migrated.push(normalized);
      });
    }
  } catch (error) {
    // Ignore malformed legacy review storage.
  }

  if (migrated.length) {
    return migrated;
  }

  try {
    const rawBank = JSON.parse(localStorage.getItem(LEGACY_KEYS.bank) || "[]");
    const rawOverview = JSON.parse(localStorage.getItem(LEGACY_KEYS.overview) || "null");
    const fallbackReview = normalizeReview({
      id: generateId("review"),
      title: rawOverview && rawOverview.unitName ? rawOverview.unitName : "Physics Review",
      topics: rawOverview && rawOverview.topics ? rawOverview.topics : [],
      questions: Array.isArray(rawBank) ? rawBank : []
    }, 0);

    if (fallbackReview && (fallbackReview.questions.length || fallbackReview.title)) {
      return [fallbackReview];
    }
  } catch (error) {
    // Ignore malformed legacy bank storage.
  }

  return [];
}

function loadReviews() {
  const candidates = [STORAGE_KEY, LEGACY_STORAGE_KEY];

  for (const key of candidates) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const parsed = parseStatePayload(JSON.parse(raw));
      if (!parsed) continue;

      state.reviews = parsed.reviews.map((review, index) => normalizeReview(review, index)).filter(Boolean);
      state.updatedAt = parsed.updatedAt;
      if (key !== STORAGE_KEY) {
        saveReviews();
      }
      return;
    } catch (error) {
      // Ignore malformed storage.
    }
  }

  state.reviews = migrateLegacyReviews();
  state.updatedAt = state.reviews.length ? new Date().toISOString() : null;
  saveReviews();
}

function saveReviews(markUpdated = false) {
  if (markUpdated || !state.updatedAt) {
    touchUpdatedAt();
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(getStatePayload()));
}

function loadGitHubSync() {
  state.sync.repo = detectGitHubRepo();

  try {
    const raw = JSON.parse(localStorage.getItem(GITHUB_SYNC_KEY) || "null");
    if (raw && typeof raw === "object" && typeof raw.token === "string") {
      state.sync.token = raw.token;
    }
  } catch (error) {
    // Ignore malformed sync settings.
  }
}

function saveGitHubSync() {
  localStorage.setItem(GITHUB_SYNC_KEY, JSON.stringify({
    token: state.sync.token
  }));
}

function setSyncStatus(message, tone = "neutral") {
  state.sync.status = message;
  state.sync.tone = tone;
  if (!syncStatus) return;
  syncStatus.textContent = message;
  syncStatus.className = `sync-status${tone === "neutral" ? "" : ` ${tone}`}`;
}

function renderSyncPanel() {
  if (githubTokenInput) {
    githubTokenInput.value = state.sync.token;
  }

  if (syncRepoValue) {
    syncRepoValue.textContent = state.sync.repo
      ? `${state.sync.repo.owner}/${state.sync.repo.repo}`
      : "Open this from GitHub Pages to enable live publishing.";
  }

  if (saveSyncBtn) {
    saveSyncBtn.disabled = state.sync.busy;
  }

  if (publishNowBtn) {
    publishNowBtn.disabled = state.sync.busy;
    publishNowBtn.textContent = state.sync.busy ? "Publishing..." : "Publish Now";
  }

  if (!state.sync.status) {
    if (state.sync.repo) {
      setSyncStatus("Students load the shared questions.json bank when they enter or refresh the page.");
    } else {
      setSyncStatus("Live publishing works from the GitHub Pages link for this project.", "warning");
    }
  } else if (syncStatus) {
    syncStatus.textContent = state.sync.status;
    syncStatus.className = `sync-status${state.sync.tone === "neutral" ? "" : ` ${state.sync.tone}`}`;
  }
}

async function fetchPublishedState() {
  const localUrl = `${PUBLISHED_FILE_PATH}?ts=${Date.now()}`;

  if (state.sync.repo) {
    try {
      const endpoint = `${GITHUB_API_BASE}/repos/${encodeURIComponent(state.sync.repo.owner)}/${encodeURIComponent(state.sync.repo.repo)}/contents/${encodeGitHubPath(PUBLISHED_FILE_PATH)}?ts=${Date.now()}`;
      const response = await fetch(endpoint, {
        headers: {
          Accept: "application/vnd.github+json"
        }
      });

      if (response.status === 404) {
        return null;
      }

      if (response.ok) {
        const payload = await response.json();
        const content = payload && typeof payload.content === "string" ? payload.content.replace(/\n/g, "") : "";
        if (content) {
          return parseStatePayload(JSON.parse(base64ToUtf8(content)));
        }
      }
    } catch (error) {
      // Fall back to the static file below.
    }
  }

  try {
    const response = await fetch(localUrl, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }

    return parseStatePayload(await response.json());
  } catch (error) {
    return null;
  }
}

async function refreshPublishedReviews() {
  const published = await fetchPublishedState();
  if (!published) return;

  const normalizedReviews = published.reviews.map((review, index) => normalizeReview(review, index)).filter(Boolean);
  const localSnapshot = JSON.stringify(state.reviews);
  const remoteSnapshot = JSON.stringify(normalizedReviews);
  const shouldApply =
    !state.reviews.length ||
    isTimestampNewer(published.updatedAt, state.updatedAt) ||
    (!state.updatedAt && localSnapshot !== remoteSnapshot);

  if (!shouldApply) return;

  state.reviews = normalizedReviews;
  state.updatedAt = published.updatedAt || state.updatedAt;
  saveReviews();
  renderReviewGrid();
  renderAdminList();
}

async function publishReviewsToGitHub(manual = false) {
  if (state.sync.busy) return false;

  if (!state.sync.repo) {
    setSyncStatus("Open PhysicsQuest from your GitHub Pages link to publish live updates.", "warning");
    return false;
  }

  if (!state.sync.token.trim()) {
    setSyncStatus("Save your GitHub token first. Then PhysicsQuest can publish to students.", "warning");
    return false;
  }

  state.sync.busy = true;
  renderSyncPanel();
  setSyncStatus("Publishing latest reviews to GitHub...", "warning");

  try {
    const endpoint = `${GITHUB_API_BASE}/repos/${encodeURIComponent(state.sync.repo.owner)}/${encodeURIComponent(state.sync.repo.repo)}/contents/${encodeGitHubPath(PUBLISHED_FILE_PATH)}`;
    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${state.sync.token.trim()}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json"
    };

    let sha = "";
    const existingResponse = await fetch(endpoint, { headers });
    if (existingResponse.ok) {
      const existing = await existingResponse.json();
      sha = String(existing.sha || "");
    } else if (existingResponse.status !== 404) {
      throw new Error("GitHub could not open questions.json in the repository.");
    }

    const response = await fetch(endpoint, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message: `Publish PhysicsQuest reviews (${new Date().toLocaleString()})`,
        content: utf8ToBase64(JSON.stringify(getStatePayload(), null, 2)),
        ...(sha ? { sha } : {})
      })
    });

    if (!response.ok) {
      let details = "GitHub rejected the publish request.";
      try {
        const payload = await response.json();
        if (payload && payload.message) {
          details = payload.message;
        }
      } catch (error) {
        // Ignore body parsing errors.
      }
      throw new Error(details);
    }

    setSyncStatus("Published to GitHub. Students will get the new questions when they open or refresh the link.", "success");
    return true;
  } catch (error) {
    setSyncStatus(`Publish failed: ${error.message}`, "error");
    if (manual) {
      window.alert(`GitHub publish failed.\n\n${error.message}`);
    }
    return false;
  } finally {
    state.sync.busy = false;
    renderSyncPanel();
  }
}

async function persistReviews(options = {}) {
  const { publish = true, manual = false } = options;
  saveReviews(true);
  renderReviewGrid();
  renderAdminList();

  if (!publish) {
    return true;
  }

  if (!state.sync.token.trim()) {
    setSyncStatus("Saved on this computer. Add your GitHub token to publish to students.", "warning");
    return false;
  }

  return publishReviewsToGitHub(manual);
}

function renderReviewGrid() {
  reviewGrid.innerHTML = "";

  if (!state.reviews.length) {
    const emptyCard = makeEl("article", "review-card");
    emptyCard.append(
      makeEl("h3", "", "No physics reviews yet"),
      makeEl("div", "empty-state", "Use Teacher Admin to create your first review.")
    );
    reviewGrid.appendChild(emptyCard);
    return;
  }

  state.reviews.forEach((review) => {
    const card = makeEl("article", "review-card");
    const title = makeEl("h3", "", review.title);
    const stats = makeEl("div", "review-stats");
    stats.append(
      makeEl("span", "review-chip", `${review.questions.length} questions`),
      makeEl("span", "review-chip", "45:00 timer")
    );
    const startBtn = makeEl("button", "btn primary", "Start Review");
    startBtn.type = "button";
    startBtn.disabled = review.questions.length === 0;
    startBtn.addEventListener("click", () => startQuiz(review.id));
    card.append(title, stats, startBtn);
    reviewGrid.appendChild(card);
  });
}

function prepareQuizQuestion(question) {
  if (question.type !== "mc") {
    return { ...question };
  }

  const choices = shuffleArray(
    question.choices.map((choice, index) => ({
      text: choice,
      isCorrect: index === question.correctIndex
    }))
  );

  return {
    ...question,
    choices,
    correctIndex: choices.findIndex((choice) => choice.isCorrect)
  };
}

function buildQuiz(review) {
  const questions = shuffleArray(review.questions).map(prepareQuizQuestion);
  return {
    reviewId: review.id,
    reviewTitle: review.title,
    questions,
    index: 0,
    score: 0,
    timeLeft: DEFAULT_QUIZ_SECONDS,
    timerId: null,
    responses: questions.map(() => ({
      status: "pending",
      answered: false,
      correct: false,
      selectedIndex: null,
      value: "",
      hintOpened: false,
      feedback: ""
    }))
  };
}

function updateQuizStatus() {
  if (!state.quiz) return;
  timerDisplay.textContent = formatTime(state.quiz.timeLeft);
  progressDisplay.textContent = `Question ${state.quiz.index + 1} of ${state.quiz.questions.length}`;
  scoreDisplay.textContent = `Score: ${state.quiz.score}`;
  reviewTitleBadge.textContent = state.quiz.reviewTitle;
}

function renderQuestionNav() {
  if (!state.quiz) return;
  questionNav.innerHTML = "";

  state.quiz.responses.forEach((response, index) => {
    const button = makeEl("button", `question-pill ${response.status}`, String(index + 1));
    button.type = "button";
    if (index === state.quiz.index) {
      button.classList.add("current");
    }
    button.addEventListener("click", () => {
      state.quiz.index = index;
      renderQuestion();
    });
    questionNav.appendChild(button);
  });
}

function mcCorrectLabel(question) {
  const correctIndex = question.choices.findIndex((choice) => choice.isCorrect);
  if (correctIndex < 0) return "";
  return `${LETTERS[correctIndex]}) ${question.choices[correctIndex].text}`;
}

function fillCorrectLabel(question) {
  return question.answers.join(" / ");
}

function numericCorrectLabel(question) {
  return `${question.answer} +/- ${question.tolerance}`;
}

function currentQuestion() {
  if (!state.quiz) return null;
  return state.quiz.questions[state.quiz.index] || null;
}

function currentResponse() {
  if (!state.quiz) return null;
  return state.quiz.responses[state.quiz.index] || null;
}

function renderHint(question, response) {
  const hasHint = Boolean(question && question.hint);
  hintBtn.disabled = !hasHint;
  hintBox.classList.toggle("hidden", !(hasHint && response.hintOpened));
  hintBox.textContent = hasHint && response.hintOpened ? `Hint: ${question.hint}` : "";
}

function renderMcQuestion(question, response) {
  question.choices.forEach((choice, index) => {
    const optionBtn = makeEl("button", "option-btn");
    optionBtn.type = "button";
    if (response.answered) {
      optionBtn.disabled = true;
      if (index === response.selectedIndex) {
        optionBtn.classList.add(response.correct ? "correct" : "incorrect");
      }
      if (!response.correct && choice.isCorrect) {
        optionBtn.classList.add("reveal");
      }
    }

    const letter = makeEl("span", "option-letter", LETTERS[index]);
    const text = makeEl("span", "option-text", choice.text);
    optionBtn.append(letter, text);
    optionBtn.addEventListener("click", () => handleMcAnswer(index));
    optionsGrid.appendChild(optionBtn);
  });
}

function renderInputQuestion(question, response) {
  const block = makeEl("div", "fill-block");
  const input = document.createElement("input");
  input.className = "fill-input";
  input.type = "text";
  input.placeholder = question.type === "numeric" ? "Type a number" : "Type your answer";
  input.value = response.value || "";
  if (question.type === "numeric") {
    input.inputMode = "decimal";
  }

  const submitBtn = makeEl("button", "btn primary", "Check Answer");
  submitBtn.type = "button";

  if (response.answered) {
    input.disabled = true;
    submitBtn.disabled = true;
  }

  const submitAnswer = () => {
    if (question.type === "numeric") {
      handleNumericAnswer(input.value);
    } else {
      handleFillAnswer(input.value);
    }
  };

  submitBtn.addEventListener("click", submitAnswer);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitAnswer();
    }
  });

  block.append(input, submitBtn);
  optionsGrid.appendChild(block);
}

function renderQuestion() {
  const question = currentQuestion();
  const response = currentResponse();
  if (!question || !response) return;

  updateQuizStatus();
  renderQuestionNav();

  questionText.textContent = question.questionText;
  renderHint(question, response);

  optionsGrid.innerHTML = "";
  feedbackText.textContent = response.feedback || "";
  continueBtn.disabled = !response.answered;

  if (question.type === "mc") {
    renderMcQuestion(question, response);
  } else {
    renderInputQuestion(question, response);
  }
}

function markResponse(correct, feedback, extra = {}) {
  const response = currentResponse();
  if (!response || response.answered) return;

  response.answered = true;
  response.correct = correct;
  response.status = correct ? "correct" : "incorrect";
  response.feedback = feedback;
  Object.assign(response, extra);

  if (correct) {
    state.quiz.score += 1;
  }

  renderQuestion();
}

function handleMcAnswer(index) {
  const question = currentQuestion();
  const response = currentResponse();
  if (!question || !response || response.answered) return;

  const selected = question.choices[index];
  if (selected.isCorrect) {
    markResponse(true, "Correct! Continue.", { selectedIndex: index });
    return;
  }

  markResponse(false, `Incorrect. Correct answer: ${mcCorrectLabel(question)}`, { selectedIndex: index });
}

function handleFillAnswer(value) {
  const question = currentQuestion();
  const response = currentResponse();
  if (!question || !response || response.answered) return;

  const rawValue = String(value || "").trim();
  if (!rawValue) {
    feedbackText.textContent = "Enter an answer to continue.";
    return;
  }

  const normalized = normalizeFreeText(rawValue);
  const isCorrect = question.answers.some((answer) => normalizeFreeText(answer) === normalized);
  if (isCorrect) {
    markResponse(true, "Correct! Continue.", { value: rawValue });
    return;
  }

  markResponse(false, `Incorrect. Correct answer: ${fillCorrectLabel(question)}`, { value: rawValue });
}

function handleNumericAnswer(value) {
  const question = currentQuestion();
  const response = currentResponse();
  if (!question || !response || response.answered) return;

  const rawValue = String(value || "").trim();
  if (!rawValue) {
    feedbackText.textContent = "Enter a number to continue.";
    return;
  }

  const numericValue = extractFirstNumber(rawValue);
  if (!Number.isFinite(numericValue)) {
    feedbackText.textContent = "Enter a valid number.";
    return;
  }

  const isCorrect = Math.abs(numericValue - question.answer) <= question.tolerance;
  if (isCorrect) {
    markResponse(true, "Correct! Continue.", { value: rawValue });
    return;
  }

  markResponse(false, `Incorrect. Acceptable answer: ${numericCorrectLabel(question)}`, { value: rawValue });
}

function allQuestionsAnswered() {
  return state.quiz.responses.every((response) => response.answered);
}

function getNextUnansweredIndex() {
  const total = state.quiz.responses.length;
  for (let offset = 1; offset <= total; offset += 1) {
    const nextIndex = (state.quiz.index + offset) % total;
    if (!state.quiz.responses[nextIndex].answered) {
      return nextIndex;
    }
  }
  return state.quiz.index;
}

function continueQuiz() {
  if (!state.quiz) return;
  if (allQuestionsAnswered()) {
    endQuiz();
    return;
  }

  state.quiz.index = getNextUnansweredIndex();
  renderQuestion();
}

function startTimer() {
  if (!state.quiz || state.quiz.timerId) return;

  state.quiz.timerId = window.setInterval(() => {
    if (!state.quiz) return;
    state.quiz.timeLeft -= 1;
    if (state.quiz.timeLeft <= 0) {
      state.quiz.timeLeft = 0;
      updateQuizStatus();
      endQuiz();
      return;
    }
    updateQuizStatus();
  }, 1000);
}

function stopTimer() {
  if (!state.quiz || !state.quiz.timerId) return;
  window.clearInterval(state.quiz.timerId);
  state.quiz.timerId = null;
}

function startQuiz(reviewId) {
  const review = state.reviews.find((item) => item.id === reviewId);
  if (!review || review.questions.length === 0) return;

  stopTimer();
  state.selectedReview = review;
  state.quiz = buildQuiz(review);
  showStudentView("quizView");
  renderQuestion();
  startTimer();
}

function endQuiz() {
  if (!state.quiz || !state.selectedReview) return;

  stopTimer();
  const total = state.quiz.questions.length;
  const score = state.quiz.score;
  const percent = total === 0 ? 0 : Math.round((score / total) * 100);

  resultsTitle.textContent = state.selectedReview.title;
  finalScore.textContent = `Final score: ${score} / ${total}`;
  finalPercent.textContent = `${percent}%`;

  if (percent < 60) {
    finalMessage.textContent = "You should review the key concepts and try again.";
  } else if (percent < 80) {
    finalMessage.textContent = "Good progress. Review what you missed and retry.";
  } else {
    finalMessage.textContent = "Excellent. You are ready for the assessment.";
  }

  showStudentView("resultsView");
}

function leaveQuizIfNeeded() {
  if (!state.quiz) return true;

  const confirmed = window.confirm("Leave the current review? Your progress will be lost.");
  if (!confirmed) return false;

  stopTimer();
  state.quiz = null;
  state.selectedReview = null;
  return true;
}

function goHome() {
  if (!leaveQuizIfNeeded()) return;
  showStudentView("homeView");
}

function serializeQuestions(questions) {
  return questions
    .map((question) => {
      const lines = [];
      if (question.topic) {
        lines.push(`Topic: ${question.topic}`);
      }
      lines.push(question.questionText);

      if (question.type === "mc") {
        question.choices.forEach((choice, index) => {
          const star = index === question.correctIndex ? "*" : "";
          lines.push(`${LETTERS[index]}) ${choice}${star}`);
        });
      } else if (question.type === "numeric") {
        lines.push(`Answer: ${question.answer}`);
        lines.push(`Tolerance: ${question.tolerance}`);
      } else {
        lines.push(`Answer: ${question.answers.join(" | ")}`);
      }

      if (question.hint) {
        lines.push(`Hint: ${question.hint}`);
      }

      return lines.join("\n");
    })
    .join("\n\n");
}

function showParseErrors(messages) {
  if (!messages.length) {
    parseErrors.classList.remove("show");
    parseErrors.innerHTML = "";
    return;
  }

  parseErrors.classList.add("show");
  parseErrors.innerHTML = messages.map((message) => `<div>${message}</div>`).join("");
}

function openEditor(review = null) {
  showParseErrors([]);
  state.editingId = review ? review.id : null;
  editorTitle.textContent = review ? "Edit Review" : "Create New Review";
  titleInput.value = review ? review.title : "";
  questionsInput.value = review ? serializeQuestions(review.questions) : "";
  showAdminView("adminEditor");
}

async function deleteReview(review) {
  const confirmed = window.confirm(`Delete "${review.title}"? This cannot be undone.`);
  if (!confirmed) return;
  state.reviews = state.reviews.filter((item) => item.id !== review.id);
  await persistReviews();
}

async function duplicateReview(review) {
  const copy = normalizeReview({
    ...review,
    id: generateId("review"),
    title: `${review.title} (Copy)`
  });
  state.reviews.push(copy);
  await persistReviews();
}

async function clearReviewQuestions(review) {
  const confirmed = window.confirm(`Delete all questions from "${review.title}"?`);
  if (!confirmed) return;
  state.reviews = state.reviews.map((item) => {
    if (item.id !== review.id) return item;
    return {
      ...item,
      questions: [],
      topics: []
    };
  });
  await persistReviews();
}

function renderAdminList() {
  adminList.innerHTML = "";

  if (!state.reviews.length) {
    const emptyRow = makeEl("div", "admin-row");
    emptyRow.append(
      makeEl("h3", "", "No reviews yet"),
      makeEl("div", "admin-meta", "Create your first physics review.")
    );
    adminList.appendChild(emptyRow);
    return;
  }

  const sorted = [...state.reviews].sort((left, right) => left.title.localeCompare(right.title));
  sorted.forEach((review) => {
    const row = makeEl("div", "admin-row");

    const info = makeEl("div");
    info.append(
      makeEl("h3", "", review.title),
      makeEl("div", "admin-meta", `Questions: ${review.questions.length} · Time: ${formatTime(DEFAULT_QUIZ_SECONDS)}`)
    );

    const actions = makeEl("div", "admin-actions");
    const editBtn = makeEl("button", "btn ghost", "Edit");
    const duplicateBtn = makeEl("button", "btn ghost", "Duplicate");
    const clearBtn = makeEl("button", "btn ghost", "Clear Questions");
    const deleteBtn = makeEl("button", "btn ghost", "Delete");

    [editBtn, duplicateBtn, clearBtn, deleteBtn].forEach((button) => {
      button.type = "button";
    });

    editBtn.addEventListener("click", () => openEditor(review));
    duplicateBtn.addEventListener("click", () => duplicateReview(review));
    clearBtn.addEventListener("click", () => clearReviewQuestions(review));
    deleteBtn.addEventListener("click", () => deleteReview(review));

    actions.append(editBtn, duplicateBtn, clearBtn, deleteBtn);
    row.append(info, actions);
    adminList.appendChild(row);
  });
}

function isTeacherContinuationLine(line) {
  return (
    /^Topic\s*:/i.test(line) ||
    /^Hint\s*:/i.test(line) ||
    /^Answer\s*:/i.test(line) ||
    /^Tolerance\s*:/i.test(line) ||
    /^([A-D])\)\s*(.+)$/i.test(line)
  );
}

function splitTeacherBlocks(cleaned) {
  const lines = cleaned.split("\n");
  const blocks = [];
  let current = [];
  let previousWasBlank = false;

  lines.forEach((rawLine) => {
    const line = rawLine.trim();

    if (!line) {
      previousWasBlank = true;
      return;
    }

    if (!current.length) {
      current.push(line);
      previousWasBlank = false;
      return;
    }

    const continuation = isTeacherContinuationLine(line);
    const currentHasContinuation = current.some((item) => isTeacherContinuationLine(item));
    const startsNewQuestion = !continuation && (currentHasContinuation || previousWasBlank);

    if (startsNewQuestion) {
      blocks.push(current.join("\n"));
      current = [line];
    } else {
      current.push(line);
    }

    previousWasBlank = false;
  });

  if (current.length) {
    blocks.push(current.join("\n"));
  }

  return blocks.reduce((merged, block) => {
    const firstLine = block.split("\n").map((line) => line.trim()).find(Boolean) || "";
    if (merged.length && isTeacherContinuationLine(firstLine)) {
      merged[merged.length - 1] = `${merged[merged.length - 1]}\n${block}`;
      return merged;
    }
    merged.push(block);
    return merged;
  }, []);
}

function parseQuestions(rawText) {
  const cleaned = String(rawText || "").replace(/\r\n/g, "\n").trim();
  if (!cleaned) {
    return { questions: [], errors: [] };
  }

  const blocks = splitTeacherBlocks(cleaned).map((block) => block.trim()).filter(Boolean);
  const errors = [];
  const questions = [];

  blocks.forEach((block, blockIndex) => {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    let promptParts = [];
    let hint = "";
    let topic = "";
    let answerLine = "";
    let toleranceLine = "";
    const optionEntries = [];

    lines.forEach((line) => {
      if (/^Topic\s*:/i.test(line)) {
        topic = line.replace(/^Topic\s*:\s*/i, "").trim();
        return;
      }
      if (/^Hint\s*:/i.test(line)) {
        hint = line.replace(/^Hint\s*:\s*/i, "").trim();
        return;
      }
      if (/^Answer\s*:/i.test(line)) {
        answerLine = line.replace(/^Answer\s*:\s*/i, "").trim();
        return;
      }
      if (/^Tolerance\s*:/i.test(line)) {
        toleranceLine = line.replace(/^Tolerance\s*:\s*/i, "").trim();
        return;
      }

      const optionMatch = line.match(/^([A-D])\)\s*(.+)$/i);
      if (optionMatch) {
        optionEntries.push({
          letter: optionMatch[1].toUpperCase(),
          text: optionMatch[2].trim()
        });
        return;
      }

      promptParts.push(line);
    });

    const questionText = promptParts.join(" ").trim();
    const label = `Question block ${blockIndex + 1}`;

    if (!questionText) {
      errors.push(`${label}: missing the question text.`);
      return;
    }

    if (optionEntries.length > 0) {
      if (answerLine) {
        errors.push(`${label}: use either multiple choice options or Answer:, not both.`);
        return;
      }

      const optionMap = {};
      let correctLetter = "";

      optionEntries.forEach((entry) => {
        if (optionMap[entry.letter]) {
          errors.push(`${label}: duplicate option ${entry.letter}).`);
          return;
        }
        const isCorrect = entry.text.includes("*");
        const cleanText = entry.text.replace(/\*/g, "").trim();
        if (!cleanText) {
          errors.push(`${label}: option ${entry.letter}) cannot be empty.`);
          return;
        }
        if (isCorrect) {
          if (correctLetter) {
            errors.push(`${label}: mark only one correct option with *.`);
            return;
          }
          correctLetter = entry.letter;
        }
        optionMap[entry.letter] = cleanText;
      });

      if (errors.length > 0 && errors[errors.length - 1].startsWith(label)) {
        return;
      }

      if (LETTERS.some((letter) => !(letter in optionMap)) || Object.keys(optionMap).length !== 4) {
        errors.push(`${label}: include exactly four options A) to D).`);
        return;
      }

      if (!correctLetter) {
        errors.push(`${label}: mark the correct option with *.`);
        return;
      }

      const question = normalizeQuestion({
        type: "mc",
        questionText,
        topic,
        hint,
        choices: LETTERS.map((letter) => optionMap[letter]),
        correctIndex: LETTERS.indexOf(correctLetter)
      }, blockIndex);

      if (!question) {
        errors.push(`${label}: could not normalize the multiple choice question.`);
        return;
      }

      questions.push(question);
      return;
    }

    if (!answerLine) {
      errors.push(`${label}: provide Answer: for fill in the blank or numerical questions.`);
      return;
    }

    if (toleranceLine) {
      const numericAnswer = Number(answerLine);
      const tolerance = Number(toleranceLine);
      if (!Number.isFinite(numericAnswer)) {
        errors.push(`${label}: numerical answers must be valid numbers.`);
        return;
      }
      if (!Number.isFinite(tolerance) || tolerance < 0) {
        errors.push(`${label}: tolerance must be a valid positive number or zero.`);
        return;
      }

      const question = normalizeQuestion({
        type: "numeric",
        questionText,
        topic,
        hint,
        answer: numericAnswer,
        tolerance
      }, blockIndex);

      if (!question) {
        errors.push(`${label}: could not normalize the numerical question.`);
        return;
      }

      questions.push(question);
      return;
    }

    const question = normalizeQuestion({
      type: "fill",
      questionText,
      topic,
      hint,
      answers: answerLine.split("|").map((value) => value.trim()).filter(Boolean)
    }, blockIndex);

    if (!question) {
      errors.push(`${label}: could not normalize the fill in the blank question.`);
      return;
    }

    questions.push(question);
  });

  if (!errors.length && questions.length > 100) {
    errors.push("Maximum 100 questions allowed per review.");
  }

  return { questions, errors };
}

function parseReviewJsonInput(rawText) {
  const trimmed = String(rawText || "").trim();
  if (!trimmed) {
    return { reviews: [], updatedAt: null, errors: ["The JSON file is empty."] };
  }

  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    return { reviews: [], updatedAt: null, errors: ["The JSON file is not valid."] };
  }

  const payload = parseStatePayload(parsed);
  if (!payload) {
    return { reviews: [], updatedAt: null, errors: ["The JSON structure is not valid for PhysicsQuest reviews."] };
  }

  const reviews = payload.reviews.map((review, index) => normalizeReview(review, index)).filter(Boolean);
  if (reviews.length !== payload.reviews.length) {
    return { reviews: [], updatedAt: null, errors: ["The JSON structure is not valid for PhysicsQuest reviews."] };
  }

  return { reviews, updatedAt: payload.updatedAt, errors: [] };
}

async function handleEditorSave(event) {
  event.preventDefault();
  const title = titleInput.value.trim();
  const errors = [];

  if (!title) {
    errors.push("Review title is required.");
  }

  const { questions, errors: questionErrors } = parseQuestions(questionsInput.value);
  errors.push(...questionErrors);

  if (errors.length) {
    showParseErrors(errors);
    return;
  }

  const review = normalizeReview({
    id: state.editingId || generateId("review"),
    title,
    questions
  });

  if (state.editingId) {
    state.reviews = state.reviews.map((item) => (item.id === state.editingId ? review : item));
  } else {
    state.reviews.push(review);
  }

  await persistReviews();
  showAdminView("adminDashboard");
}

function exportReviews() {
  const blob = new Blob([JSON.stringify(getStatePayload(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `physicsquest-reviews-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function handleImportFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async () => {
    const { reviews, updatedAt, errors } = parseReviewJsonInput(String(reader.result || ""));
    if (errors.length) {
      window.alert(errors.join("\n"));
      return;
    }

    state.reviews = reviews;
    state.updatedAt = updatedAt;
    await persistReviews();
    showAdminView("adminDashboard");
  };
  reader.readAsText(file);
  event.target.value = "";
}

function clearLocalData() {
  const confirmed = window.confirm("Clear all PhysicsQuest reviews on this computer?");
  if (!confirmed) return;

  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  localStorage.removeItem(LEGACY_KEYS.reviews);
  localStorage.removeItem(LEGACY_KEYS.bank);
  localStorage.removeItem(LEGACY_KEYS.overview);
  state.reviews = [];
  state.updatedAt = null;
  state.editingId = null;
  state.selectedReview = null;
  stopTimer();
  state.quiz = null;
  saveReviews();
  renderReviewGrid();
  renderAdminList();
  showAdminView("adminDashboard");
  setSyncStatus("Local draft bank cleared on this computer.", "warning");
}

function bindEvents() {
  teacherAdminBtn.addEventListener("click", () => {
    if (state.isAdmin) {
      state.isAdmin = false;
      updateTeacherButton();
      showStudentView("homeView");
      return;
    }

    if (!leaveQuizIfNeeded()) return;
    if (!requestTeacherAccess()) return;
    state.isAdmin = true;
    updateTeacherButton();
    renderSyncPanel();
    renderAdminList();
    showAdminView("adminDashboard");
  });

  hintBtn.addEventListener("click", () => {
    const question = currentQuestion();
    const response = currentResponse();
    if (!question || !response || !question.hint) return;
    response.hintOpened = true;
    renderHint(question, response);
  });

  continueBtn.addEventListener("click", continueQuiz);
  homeBtnQuiz.addEventListener("click", goHome);
  retryBtn.addEventListener("click", () => {
    if (!state.selectedReview) return;
    startQuiz(state.selectedReview.id);
  });
  backHomeBtn.addEventListener("click", () => {
    stopTimer();
    state.quiz = null;
    state.selectedReview = null;
    showStudentView("homeView");
  });

  createReviewBtn.addEventListener("click", () => openEditor());
  cancelEditorBtn.addEventListener("click", () => showAdminView("adminDashboard"));
  editorForm.addEventListener("submit", handleEditorSave);

  exportBtn.addEventListener("click", exportReviews);
  importBtn.addEventListener("click", () => importInput.click());
  importInput.addEventListener("change", handleImportFile);
  clearLocalBtn.addEventListener("click", clearLocalData);
  saveSyncBtn.addEventListener("click", () => {
    state.sync.token = githubTokenInput.value.trim();
    saveGitHubSync();
    setSyncStatus(
      state.sync.token
        ? "GitHub token saved on this computer. Saving a review will now publish it."
        : "GitHub token removed from this computer.",
      state.sync.token ? "success" : "warning"
    );
    renderSyncPanel();
  });
  publishNowBtn.addEventListener("click", async () => {
    state.sync.token = githubTokenInput.value.trim();
    saveGitHubSync();
    saveReviews();
    await publishReviewsToGitHub(true);
  });
}

async function init() {
  loadGitHubSync();
  const published = await fetchPublishedState();
  if (published) {
    state.reviews = published.reviews.map((review, index) => normalizeReview(review, index)).filter(Boolean);
    state.updatedAt = published.updatedAt;
    saveReviews();
  } else {
    loadReviews();
  }
  updateTeacherButton();
  renderSyncPanel();
  renderReviewGrid();
  renderAdminList();
  bindEvents();
  showStudentView("homeView");
}

init();
