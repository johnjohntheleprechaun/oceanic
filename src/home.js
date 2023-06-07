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
    const entryID = crypto.randomUUID();
    createJournal(entryID)
    .then(openJournal(entryID));
}

async function loadJournals() {
    const journals = await listJournals();
    for await (const journal of journals) {
        displayJournal(journal);
    }
}

function displayJournal(journal) {
    let entry = entryTemplate.cloneNode(true);
    let date = new Date(journal.createdAt);

    entry.querySelector(".date").innerText = (date.getMonth() + 1).toString().padStart(2,"0") + "/" + date.getDate().toString().padStart(2,"0") + "/" + date.getFullYear();
    entry.querySelector(".time").innerText = date.getHours().toString().padStart(2,"0") + ":" + date.getMinutes().toString().padStart(2,"0");
    entry.addEventListener("click", event => openJournal(event.target.attributes["data-entryid"].nodeValue));
    entry.dataset.entryid = journal.id;

    journalArea.appendChild(entry);
}

function openJournal(entryID) {
    window.location.href = window.location.origin + "/journal.html" + "#entryid=" + entryID;
}