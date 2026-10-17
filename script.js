"use strict";

const STORAGE_KEY = "gymlog-workouts-v1";

const todayElement = document.querySelector("#today");
const form = document.querySelector("#exercise-form");
const nameInput = document.querySelector("#exercise-name");
const setsInput = document.querySelector("#sets");
const repsInput = document.querySelector("#reps");
const weightInput = document.querySelector("#weight");
const saveButton = document.querySelector("#save-workout");
const sessionContainer = document.querySelector("#session-exercises");
const sessionCount = document.querySelector("#session-count");
const formMessage = document.querySelector("#form-message");
const historyContainer = document.querySelector("#workout-history");
const exportCSVButton = document.querySelector("#export-csv");
const exportMessageEl = document.querySelector("#export-message");

const totalWorkoutsElement = document.querySelector("#total-workouts");
const totalVolumeElement = document.querySelector("#total-volume");
const trainingDaysElement = document.querySelector("#training-days");

const volumeChart = document.querySelector("#volume-chart");
const analyticsTotalVolume = document.querySelector("#analytics-total-volume");
const analyticsExerciseCount = document.querySelector("#analytics-exercise-count");
const analyticsAverageVolume = document.querySelector("#analytics-average-volume");
const personalBestList = document.querySelector("#personal-best-list");

let currentSession = [];

function formatNumber(value) {
    return Number(value).toLocaleString("en-IN", {
        maximumFractionDigits: 2
    });
}

function formatVolume(value) {
    return formatNumber(value);
}

function formatDate(dateValue) {
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "Date unavailable";
    }

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function getLocalDateKey(dateValue) {
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function calculateVolume(exercises) {
    return exercises.reduce((total, exercise) => {
        return total + exercise.sets * exercise.reps * exercise.weight;
    }, 0);
}

function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== undefined) {
        element.textContent = text;
    }

    return element;
}

function loadWorkouts() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            return [];
        }

        const parsed = JSON.parse(saved);

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.filter((workout) => {
            if (
                !workout ||
                typeof workout.date !== "string" ||
                Number.isNaN(new Date(workout.date).getTime()) ||
                !Array.isArray(workout.exercises)
            ) {
                return false;
            }

            return workout.exercises.every((exercise) => {
                return (
                    exercise &&
                    typeof exercise.name === "string" &&
                    exercise.name.trim().length > 0 &&
                    Number.isInteger(exercise.sets) &&
                    exercise.sets >= 1 &&
                    exercise.sets <= 20 &&
                    Number.isInteger(exercise.reps) &&
                    exercise.reps >= 1 &&
                    exercise.reps <= 100 &&
                    Number.isFinite(exercise.weight) &&
                    exercise.weight >= 0 &&
                    exercise.weight <= 1000
                );
            });
        });
    } catch (error) {
        console.error("Could not load saved workouts:", error);
        return [];
    }
}

function saveWorkouts(workouts) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts));
        return true;
    } catch (error) {
        console.error("Could not save workouts:", error);
        return false;
    }
}

function setMessage(message) {
    formMessage.textContent = message;
}

function renderCurrentSession() {
    sessionContainer.replaceChildren();

    const count = currentSession.length;
    sessionCount.textContent = `${count} ${count === 1 ? "exercise" : "exercises"}`;
    saveButton.disabled = count === 0;

    if (count === 0) {
        sessionContainer.append(
            createElement(
                "p",
                "empty-state",
                "Your exercises will appear here when you add them."
            )
        );
        return;
    }

    currentSession.forEach((exercise, index) => {
        const row = createElement("div", "exercise-row");
        const details = createElement("div", "exercise-details");

        details.append(
            createElement("strong", "", exercise.name),
            createElement(
                "p",
                "",
                `${exercise.sets} sets × ${exercise.reps} reps × ${formatNumber(exercise.weight)} kg`
            )
        );

        const removeButton = createElement("button", "remove-exercise", "Remove");
        removeButton.type = "button";
        removeButton.setAttribute("aria-label", `Remove ${exercise.name}`);

        removeButton.addEventListener("click", () => {
            currentSession.splice(index, 1);
            renderCurrentSession();
            setMessage("Exercise removed from the current session.");
        });

        row.append(details, removeButton);
        sessionContainer.append(row);
    });
}

function renderHistory(workouts) {
    historyContainer.replaceChildren();

    if (workouts.length === 0) {
        historyContainer.append(
            createElement(
                "p",
                "empty-state",
                "No workouts saved yet. Complete your first session!"
            )
        );
        return;
    }

    const sortedWorkouts = [...workouts].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
    );

    sortedWorkouts.forEach((workout) => {
        const card = createElement("article", "history-card");
        const details = createElement("div");
        const volume = calculateVolume(workout.exercises);

        details.append(
            createElement("h3", "", formatDate(workout.date)),
            createElement(
                "p",
                "",
                workout.exercises
                    .map((exercise) => `${exercise.name} (${exercise.sets} × ${exercise.reps})`)
                    .join(" · ")
            )
        );

        const volumeElement = createElement("div", "history-volume");
        volumeElement.append(
            document.createTextNode(`${formatVolume(volume)} kg`),
            createElement("span", "", `${workout.exercises.length} exercises`)
        );

        card.append(details, volumeElement);
        historyContainer.append(card);
    });
}

function updateDashboard(workouts) {
    const totalVolume = workouts.reduce((total, workout) => {
        return total + calculateVolume(workout.exercises);
    }, 0);

    const trainingDays = new Set(
        workouts.map((workout) => getLocalDateKey(workout.date))
    );

    totalWorkoutsElement.replaceChildren(
        document.createTextNode(String(workouts.length) + " "),
        createElement("span", "", "sessions")
    );

    totalVolumeElement.replaceChildren(
        document.createTextNode(formatVolume(totalVolume) + " "),
        createElement("span", "", "kg")
    );

    trainingDaysElement.replaceChildren(
        document.createTextNode(String(trainingDays.size) + " "),
        createElement("span", "", "days")
    );
}

function renderAnalytics(workouts) {
    const totalVolume = workouts.reduce((total, workout) => {
        return total + calculateVolume(workout.exercises);
    }, 0);

    const exerciseCount = workouts.reduce((total, workout) => {
        return total + workout.exercises.length;
    }, 0);

    const averageVolume = workouts.length > 0
        ? totalVolume / workouts.length
        : 0;

    analyticsTotalVolume.textContent = formatVolume(totalVolume);
    analyticsExerciseCount.textContent = String(exerciseCount);
    analyticsAverageVolume.textContent = `${formatVolume(averageVolume)} kg`;

    renderVolumeChart(workouts);
    renderPersonalBests(workouts);
}

function renderVolumeChart(workouts) {
    volumeChart.replaceChildren();

    if (workouts.length === 0) {
        volumeChart.append(
            createElement("p", "empty-state", "Save workouts to see your volume trend.")
        );
        return;
    }

    // Combine all sessions recorded on the same local calendar day.
    const volumeByDay = new Map();

    workouts.forEach((workout) => {
        const dateKey = getLocalDateKey(workout.date);

        if (!dateKey) {
            return;
        }

        const currentVolume = volumeByDay.get(dateKey) || 0;
        volumeByDay.set(
            dateKey,
            currentVolume + calculateVolume(workout.exercises)
        );
    });

    const latestDays = [...volumeByDay.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-7);

    const maxVolume = Math.max(...latestDays.map((entry) => entry[1]), 1);

    latestDays.forEach(([dateKey, volume]) => {
        const day = createElement("div", "chart-day");
        const date = new Date(`${dateKey}T12:00:00`);

        const value = createElement("span", "chart-value", formatVolume(volume));
        const track = createElement("div", "chart-bar-track");
        const bar = createElement("div", "chart-bar");
        const label = createElement(
            "span",
            "chart-day-label",
            date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
        );

        const height = Math.max((volume / maxVolume) * 100, 4);
        bar.style.height = `${height}%`;
        bar.title = `${dateKey}: ${formatVolume(volume)} kg volume`;
        bar.setAttribute("role", "img");
        bar.setAttribute(
            "aria-label",
            `${formatDate(dateKey)}: ${formatVolume(volume)} kilograms volume`
        );

        track.append(bar);
        day.append(value, track, label);
        volumeChart.append(day);
    });
}

function renderPersonalBests(workouts) {
    personalBestList.replaceChildren();

    const bests = new Map();

    workouts.forEach((workout) => {
        workout.exercises.forEach((exercise) => {
            const key = exercise.name.trim().toLocaleLowerCase();
            const existing = bests.get(key);

            const candidate = {
                name: exercise.name.trim(),
                weight: exercise.weight,
                sets: exercise.sets,
                reps: exercise.reps,
                date: workout.date
            };

            // The highest logged weight wins. For a tie, prefer more reps.
            if (
                !existing ||
                candidate.weight > existing.weight ||
                (
                    candidate.weight === existing.weight &&
                    candidate.reps > existing.reps
                )
            ) {
                bests.set(key, candidate);
            }
        });
    });

    if (bests.size === 0) {
        personalBestList.append(
            createElement(
                "p",
                "empty-state",
                "Your personal bests will appear after you save a workout."
            )
        );
        return;
    }

    const sortedBests = [...bests.values()].sort((a, b) => {
        return a.name.localeCompare(b.name);
    });

    sortedBests.forEach((best) => {
        const card = createElement("article", "personal-best-card");
        const topLine = createElement("div", "pb-topline");
        const trophy = createElement("span", "pb-trophy", "★");
        const label = createElement("span", "pb-label", "PERSONAL BEST");

        topLine.append(trophy, label);

        const weight = createElement("p", "pb-weight");
        weight.append(
            document.createTextNode(formatNumber(best.weight) + " "),
            createElement("span", "", "kg")
        );

        card.append(
            topLine,
            createElement("h3", "", best.name),
            weight,
            createElement(
                "p",
                "pb-details",
                `${best.sets} sets × ${best.reps} reps`
            ),
            createElement("p", "pb-date", `Recorded ${formatDate(best.date)}`)
        );

        personalBestList.append(card);
    });
}

function refreshDashboard() {
    const workouts = loadWorkouts();

    updateDashboard(workouts);
    renderHistory(workouts);
    renderAnalytics(workouts);
}

// ── Export CSV ────────────────────────────────────────────────

/**
 * Escapes a single CSV field value per RFC 4180:
 * - Wraps in double-quotes if the value contains a comma, double-quote, or newline.
 * - Doubles any embedded double-quote characters.
 * @param {string|number} value
 * @returns {string}
 */
function csvEscape(value) {
    const str = String(value === null || value === undefined ? "" : value);
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

/**
 * Converts an array of workout objects to a CSV string.
 * Produces one row per exercise per workout session.
 * @param {Array} workouts
 * @returns {string} CSV content with CRLF line endings (RFC 4180).
 */
function buildCSV(workouts) {
    const CRLF = "\r\n";
    const headers = [
        "Workout Date",
        "Workout ID",
        "Exercise Name",
        "Sets",
        "Reps per Set",
        "Weight (kg)",
        "Volume (kg)"
    ];

    const rows = [headers.map(csvEscape).join(",")];

    // Sort chronologically (oldest first) so the CSV reads naturally.
    const sorted = [...workouts].sort(
        (a, b) => new Date(a.date) - new Date(b.date)
    );

    sorted.forEach((workout) => {
        const workoutDate = getLocalDateKey(workout.date) || formatDate(workout.date);
        const workoutId = workout.id || "";

        workout.exercises.forEach((exercise) => {
            const volume = exercise.sets * exercise.reps * exercise.weight;
            const row = [
                csvEscape(workoutDate),
                csvEscape(workoutId),
                csvEscape(exercise.name),
                csvEscape(exercise.sets),
                csvEscape(exercise.reps),
                csvEscape(exercise.weight),
                csvEscape(volume)
            ];
            rows.push(row.join(","));
        });
    });

    return rows.join(CRLF) + CRLF;
}

/**
 * Displays a transient status message below the Export CSV button.
 * Automatically fades out after the given duration.
 * @param {string} message
 * @param {'success'|'error'} type
 * @param {number} [duration=4000] milliseconds before auto-hide
 */
function showExportMessage(message, type, duration) {
    if (duration === undefined) {
        duration = 4000;
    }

    exportMessageEl.textContent = message;
    exportMessageEl.className = "export-message " + type;

    // Trigger the CSS transition on next frame.
    requestAnimationFrame(() => {
        exportMessageEl.classList.add("visible");
    });

    clearTimeout(exportMessageEl._hideTimer);
    exportMessageEl._hideTimer = setTimeout(() => {
        exportMessageEl.classList.remove("visible");
    }, duration);
}

/**
 * Reads all saved workouts, builds a CSV, and triggers a browser download.
 * Handles empty history gracefully without producing an empty file.
 */
function exportWorkoutsCSV() {
    const workouts = loadWorkouts();

    if (workouts.length === 0) {
        showExportMessage(
            "No workouts to export yet. Log your first session!",
            "error"
        );
        return;
    }

    const csvContent = buildCSV(workouts);

    // Build a dated filename: gymlog-workouts-YYYY-MM-DD.csv
    const today = getLocalDateKey(new Date().toISOString()) || "export";
    const filename = `gymlog-workouts-${today}.csv`;

    try {
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");

        anchor.href = url;
        anchor.download = filename;
        anchor.style.display = "none";
        document.body.appendChild(anchor);
        anchor.click();

        // Clean up the temporary anchor and object URL.
        setTimeout(() => {
            document.body.removeChild(anchor);
            URL.revokeObjectURL(url);
        }, 1000);

        const exerciseCount = workouts.reduce((n, w) => n + w.exercises.length, 0);
        showExportMessage(
            `✓ Exported ${workouts.length} workout${workouts.length === 1 ? "" : "s"} (${exerciseCount} exercises) as ${filename}`,
            "success"
        );
    } catch (error) {
        console.error("CSV export failed:", error);
        showExportMessage(
            "Export failed. Your browser may not support file downloads.",
            "error"
        );
    }
}

function updateToday() {
    const now = new Date();

    todayElement.textContent = now.toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    }).toUpperCase();
}

form.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = nameInput.value.trim();
    const sets = Number(setsInput.value);
    const reps = Number(repsInput.value);
    const weight = Number(weightInput.value);

    if (!name) {
        setMessage("Please enter an exercise name.");
        nameInput.focus();
        return;
    }

    if (
        !Number.isInteger(sets) ||
        sets < 1 ||
        sets > 20 ||
        !Number.isInteger(reps) ||
        reps < 1 ||
        reps > 100 ||
        !Number.isFinite(weight) ||
        weight < 0 ||
        weight > 1000
    ) {
        setMessage("Check your sets, reps and weight values.");
        return;
    }

    currentSession.push({ name, sets, reps, weight });

    renderCurrentSession();
    setMessage(`${name} added to your current session.`);
    nameInput.value = "";
    nameInput.focus();
});

saveButton.addEventListener("click", () => {
    if (currentSession.length === 0) {
        setMessage("Add at least one exercise before saving.");
        return;
    }

    const workouts = loadWorkouts();

    const workout = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        date: new Date().toISOString(),
        exercises: currentSession.map((exercise) => ({ ...exercise }))
    };

    workouts.push(workout);

    if (!saveWorkouts(workouts)) {
        setMessage("Could not save this workout. Check browser storage settings.");
        return;
    }

    const savedCount = currentSession.length;
    currentSession = [];

    renderCurrentSession();
    refreshDashboard();
    setMessage(
        `Workout saved with ${savedCount} ${savedCount === 1 ? "exercise" : "exercises"}. Analytics updated!`
    );
});

exportCSVButton.addEventListener("click", exportWorkoutsCSV);

updateToday();
renderCurrentSession();
refreshDashboard();