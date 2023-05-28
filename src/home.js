import { dynamoPutItem, dynamoScan, utilsInit } from "./utils/aws";

let entryTemplate;
let journalArea;

window.addEventListener("load", async () => {
    entryTemplate = document.getElementById("journal-entry-template").content.querySelector(".journal-entry ");
    journalArea = document.getElementById("journals");
    document.getElementById("create-journal").addEventListener("click", createJournal);

    await utilsInit();
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
    const params = {
        TableName: "journal-entry-list"
    };
    const journals = await dynamoScan(params);
    setJournals(journals);
}

function setJournals(data) {
    const sorted = data.sort((a,b) => a.created.N >= b.created.N ? 1 : -1);
    sorted.forEach(addJournal);
}

function addJournal(journal) {
    let entry = entryTemplate.cloneNode(true);
    let date = new Date(parseInt(journal.created.N));

    entry.querySelector(".date").innerText = (date.getMonth() + 1).toString().padStart(2,"0") + "/" + date.getDate().toString().padStart(2,"0") + "/" + date.getFullYear();
    entry.querySelector(".time").innerText = date.getHours().toString().padStart(2,"0") + ":" + date.getMinutes().toString().padStart(2,"0");
    entry.addEventListener("click", event => openJournal(event.target.attributes["data-entryid"].nodeValue));
    entry.dataset.entryid = journal.entryID.S;

    journalArea.appendChild(entry);
}

function openJournal(entryID) {
    window.location.href = window.location.origin + "/journal.html" + "#entryid=" + entryID;
}