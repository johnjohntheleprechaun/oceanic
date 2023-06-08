import { createJournal, dbInit, listJournals } from "./utils/storage";

let entryTemplate;
let journalArea;

window.addEventListener("load", async () => {
    entryTemplate = document.getElementById("journal-entry-template").content.querySelector(".journal-entry ");
    journalArea = document.getElementById("journals");
    document.getElementById("create-journal").addEventListener("click", newJournal);

    await dbInit();
    await loadJournals();
})

function newJournal() {
    const title = formatDate(Date.now());
    createJournal(title)
    .then(id => openJournal(id));
}

async function loadJournals() {
    const journals = await listJournals();
    for await (const journal of journals) {
        displayJournal(journal);
    }
}

function displayJournal(journal) {
    let entry = entryTemplate.cloneNode(true);

    entry.querySelector(".date").innerText = formatDate(journal.created);
    entry.querySelector(".time").innerText = formatTime(journal.created);
    entry.addEventListener("click", event => openJournal(event.target.attributes["data-entryid"].nodeValue));
    entry.dataset.entryid = journal.id;

    journalArea.appendChild(entry);
}

function formatDate(timestamp) {
    let date = new Date(timestamp);
    return (date.getMonth() + 1).toString().padStart(2,"0") + "/" + date.getDate().toString().padStart(2,"0") + "/" + date.getFullYear();
}
function formatTime(timestamp) {
    let date = new Date(timestamp);
    return date.getHours().toString().padStart(2,"0") + ":" + date.getMinutes().toString().padStart(2,"0");
}

function openJournal(entryID) {
    window.location.href = window.location.origin + "/journal.html" + "#entryid=" + entryID;
}