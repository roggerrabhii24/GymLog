
const todayElement = document.querySelector("#today");

if (todayElement) {
    todayElement.textContent = new Intl.DateTimeFormat("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    }).format(new Date()).toUpperCase();
}

const form = document.querySelector("#exercise-form");

if (form) {
    const nameInput = document.querySelector("#exercise-name");
    const setsInput = document.querySelector("#sets");
    const repsInput = document.querySelector("#reps");
    const weightInput = document.querySelector("#weight");
    const message = document.querySelector("#form-message");
    const sessionList = document.querySelector("#session-exercises");
    const sessionCount = document.querySelector("#session-count");
    const saveButton = document.querySelector("#save-workout");
    const historyList = document.querySelector("#workout-history");

    const STORAGE_KEY = "gymlog-workouts-v1";
    let currentSession = [];

    function loadWorkouts() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            const workouts = saved ? JSON.parse(saved) : [];

            if (!Array.isArray(workouts)) return [];

            return workouts.filter(workout =>
                workout &&
                typeof workout.date === "string" &&
                Array.isArray(workout.exercises) &&
                workout.exercises.every(exercise =>
                    exercise &&
                    typeof exercise.name === "string" &&
                    Number.isInteger(exercise.sets) &&
                    Number.isInteger(exercise.reps) &&
                    Number.isFinite(exercise.weight) &&
                    exercise.sets >= 1 &&
                    exercise.reps >= 1 &&
                    exercise.weight >= 0
                )
            );
        } catch {
            message.textContent =
                "Saved workout data could not be read. Check browser storage.";
            return [];
        }
    }

    function calculateVolume(exercises) {
        return exercises.reduce((total, exercise) => {
            return total + exercise.sets * exercise.reps * exercise.weight;
        }, 0);
    }

    function formatVolume(value) {
        return Number(value.toFixed(2)).toLocaleString("en-IN", {
            maximumFractionDigits: 2
        });
    }

    function renderCurrentSession() {
        sessionList.replaceChildren();

        sessionCount.textContent =
            `${currentSession.length} exercise${currentSession.length === 1 ? "" : "s"}`;

        saveButton.disabled = currentSession.length === 0;

        if (currentSession.length === 0) {
            const empty = document.createElement("p");
            empty.className = "empty-state";
            empty.textContent =
                "Your exercises will appear here when you add them.";
            sessionList.append(empty);
            return;
        }

        currentSession.forEach((exercise, index) => {
            const row = document.createElement("div");
            row.className = "exercise-row";

            const details = document.createElement("div");
            const title = document.createElement("strong");
            title.textContent = exercise.name;

            const info = document.createElement("span");
            info.className = "exercise-details";
            info.textContent =
                `${exercise.sets} sets × ${exercise.reps} reps × ${exercise.weight} kg`;

            details.append(title, info);

            const removeButton = document.createElement("button");
            removeButton.type = "button";
            removeButton.className = "remove-exercise";
            removeButton.textContent = "Remove";
            removeButton.setAttribute(
                "aria-label",
                `Remove ${exercise.name}`
            );

            removeButton.addEventListener("click", () => {
                currentSession.splice(index, 1);
                renderCurrentSession();
                message.textContent = "Exercise removed from current session.";
            });

            row.append(details, removeButton);
            sessionList.append(row);
        });
    }

    function renderHistory(workouts) {
        historyList.replaceChildren();

        if (workouts.length === 0) {
            const empty = document.createElement("p");
            empty.className = "empty-state";
            empty.textContent =
                "No workouts saved yet. Complete your first session!";
            historyList.append(empty);
            return;
        }

        [...workouts].reverse().forEach(workout => {
            const card = document.createElement("article");
            card.className = "history-card";

            const details = document.createElement("div");
            const title = document.createElement("strong");
            title.textContent = "Training session";

            const date = document.createElement("p");
            const parsedDate = new Date(workout.date);

            date.textContent = Number.isNaN(parsedDate.getTime())
                ? "Date unavailable"
                : parsedDate.toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short"
                });

            const exerciseSummary = document.createElement("p");
            exerciseSummary.textContent =
                `${workout.exercises.length} exercise(s) · ` +
                workout.exercises.map(exercise => exercise.name).join(", ");

            details.append(title, date, exerciseSummary);

            const volume = document.createElement("div");
            volume.className = "history-volume";
            volume.textContent =
                `${formatVolume(calculateVolume(workout.exercises))} kg`;

            const volumeLabel = document.createElement("span");
            volumeLabel.textContent = "TOTAL VOLUME";
            volume.append(volumeLabel);

            card.append(details, volume);
            historyList.append(card);
        });
    }

    function updateDashboard(workouts) {
        const totalVolume = workouts.reduce(
            (sum, workout) => sum + calculateVolume(workout.exercises),
            0
        );

        const uniqueDays = new Set(
            workouts.map(workout => workout.date.slice(0, 10))
        );

        document.querySelector("#total-workouts").innerHTML =
            `${workouts.length} <span>sessions</span>`;

        document.querySelector("#total-volume").innerHTML =
            `${formatVolume(totalVolume)} <span>kg</span>`;

        document.querySelector("#training-days").innerHTML =
            `${uniqueDays.size} <span>days</span>`;
    }

    let workouts = loadWorkouts();

    function refreshDashboard() {
        renderHistory(workouts);
        updateDashboard(workouts);
    }

    form.addEventListener("submit", event => {
        event.preventDefault();

        const name = nameInput.value.trim();
        const sets = Number(setsInput.value);
        const reps = Number(repsInput.value);
        const weight = Number(weightInput.value);

        if (
            !name ||
            !Number.isInteger(sets) || sets < 1 || sets > 20 ||
            !Number.isInteger(reps) || reps < 1 || reps > 100 ||
            !Number.isFinite(weight) || weight < 0 || weight > 1000
        ) {
            message.textContent =
                "Check the exercise name, sets, reps and weight.";
            return;
        }

        currentSession.push({ name, sets, reps, weight });

        renderCurrentSession();
        message.textContent = `${name} added to your current session.`;

        nameInput.value = "";
        nameInput.focus();
    });

    saveButton.addEventListener("click", () => {
        if (currentSession.length === 0) return;

        const workout = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            date: new Date().toISOString(),
            exercises: currentSession.map(exercise => ({ ...exercise }))
        };

        const updatedWorkouts = [...workouts, workout];

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedWorkouts));
            workouts = updatedWorkouts;
        } catch {
            message.textContent =
                "Could not save workout. Browser storage may be unavailable or full.";
            return;
        }

        currentSession = [];
        renderCurrentSession();
        refreshDashboard();
        message.textContent = "Workout saved successfully!";
    });

    renderCurrentSession();
    refreshDashboard();
}
