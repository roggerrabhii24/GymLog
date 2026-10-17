
const todayElement = document.querySelector("#today");

if (todayElement) {
    const today = new Intl.DateTimeFormat("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    }).format(new Date());

    todayElement.textContent = today.toUpperCase();
}
