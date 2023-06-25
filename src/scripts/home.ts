import { Journal, createJournal, dbInit, listJournals } from "./utils/storage";
//const css = require("css/home.css");

let entryTemplate: HTMLElement;
let journalArea: HTMLElement;

window.addEventListener("load", async () => {
    entryTemplate = document.querySelector<HTMLTemplateElement>("#journal-entry-template").content.firstElementChild as HTMLElement;
    journalArea = document.getElementById("journals");
    document.getElementById("create-journal").addEventListener("click", newJournal);
    console.log("js is running!");
    await dbInit();
    await loadJournals();
});

function newJournal() {
    const title = getDate(Date.now());
    createJournal(title)
    .then(id => openJournal(id));
}

async function loadJournals() {
    const journals = await listJournals();
    for await (const journal of journals) {
        displayJournal(journal);
    }
}

function displayJournal(journal: Journal) {
    let entry = entryTemplate.cloneNode(true) as HTMLElement;
    
    entry.querySelector<HTMLElement>(".date").innerText = getDate(journal.created);
    entry.querySelector<HTMLElement>(".time").innerText = getTime(journal.created);
    entry.addEventListener("click", event => openJournal((event.target as HTMLElement).attributes.getNamedItem("data-entryid").value));
    entry.dataset.entryid = journal.id;
    
    journalArea.appendChild(entry);
}

function getDate(timestamp: number) {
    let date = new Date(timestamp);
    return (date.getMonth() + 1).toString().padStart(2,"0") + "/" + date.getDate().toString().padStart(2,"0") + "/" + date.getFullYear();
}
function getTime(timestamp: number) {
    let date = new Date(timestamp);
    return date.getHours().toString().padStart(2,"0") + ":" + date.getMinutes().toString().padStart(2,"0");
}

function openJournal(entryID: string) {
    window.location.href = window.location.origin + "/journal.html" + "#entryid=" + entryID;
}