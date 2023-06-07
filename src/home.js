import { dynamoPutItem, dynamoScan, utilsInit } from "./utils/aws";
import { dbInit, listJournals } from "./utils/storage";

let entryTemplate;
let journalArea;

window.addEventListener("load", async () => {
    entryTemplate = document.getElementById("journal-entry-template").content.querySelector(".journal-entry ");
    journalArea = document.getElementById("journals");
    document.getElementById("create-journal").addEventListener("click", createJournal);

    await dbInit();
    await loadJournals();
})

async function createJournal(event) {
    const entryID = crypto.randomUUID();
    const params = {
        TableName: "journal-entry-list",
        Item: {
            entryID: { S: entryID },
            created: { N: Date.now().toString() }
        }
    };
    await dynamoPutItem(params);
    openJournal(entryID);
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