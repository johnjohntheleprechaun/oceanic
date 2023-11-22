import { Journal, updateJournal } from "./storage";

export async function navbarInit(journal: Journal) {
    const homeButton = document.getElementById("home-button") as HTMLImageElement;
    homeButton.addEventListener("click", (e) => {
        window.location.href = "/home.html"
    });
    const titleElement = document.getElementById("journal-title") as HTMLInputElement;
    titleElement.addEventListener("input", function() {
        journal.title = titleElement.value;
        updateJournal(journal);
    });
    setTitle(titleElement, journal);
}

function setTitle(element: HTMLInputElement, journal: Journal) {
    element.value = journal.title;
    element.placeholder = getDate(journal.created);
}
function getDate(timestamp: number): string {
    const date = new Date(timestamp);
    return (date.getMonth() + 1).toString().padStart(2,"0") + "/" + date.getDate().toString().padStart(2,"0") + "/" + date.getFullYear();

}