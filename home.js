import { dynamoScan, utilsInit } from "./aws";

const url = "https://4bwtjf5ctmo527paml7vdxnwnq0yhiuf.lambda-url.us-west-2.on.aws/journals/";

let entryTemplate;
let journalArea;

window.addEventListener("load", utilsInit);
window.addEventListener("load", loadJournals);
window.addEventListener("load", () => {
    entryTemplate = document.getElementById("journal-entry-template").content.querySelector(".journal-entry ");
    journalArea = document.getElementById("journals");
    document.getElementById("create-journal").addEventListener("click", createJournal);
})

function createJournal(event) {
    console.log(event);
    fetch(url, {
        method: "POST",
        headers: {
            "Authorization": "Bearer " + token
        }
    })
    .then(response => response.json())
    .then(data => openJournal(data.journal.entryID))
    .catch(error => console.error(error));
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