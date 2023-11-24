import { Journal } from "./storage";

export async function navbarInit(journal: Journal) {
    const homeButton = document.getElementById("home-button") as HTMLImageElement;
    homeButton.addEventListener("click", (e) => {
        window.location.href = "/home.html"
    });
    const titleElement = document.getElementById("journal-title") as HTMLInputElement;
    titleElement.addEventListener("input", function() {
        journal.setTitle(titleElement.value);
    });
    setTitle(titleElement, journal);
}

async function setTitle(element: HTMLInputElement, journal: Journal) {
    element.value = await journal.getTitle();
    element.placeholder = getDate(await journal.getCreated());
}
function getDate(timestamp: number): string {
    const date = new Date(timestamp);
    return (date.getMonth() + 1).toString().padStart(2,"0") + "/" + date.getDate().toString().padStart(2,"0") + "/" + date.getFullYear();

}