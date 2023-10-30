import { Journal, createJournal, dbInit, listJournals } from "../../scripts/utils/storage";

declare const JOURNALS: string[];
const journalTypes = JOURNALS;

let journalIcons: HTMLElement[];
let entryTemplate: HTMLElement;
let journalArea: HTMLElement;
let createButton: HTMLElement;
let createIcon: HTMLElement;
let typeSelectionSpeed: number;
let maxSelectionHeight: number;

window.addEventListener("load", async () => {
    entryTemplate = document.querySelector<HTMLTemplateElement>("#journal-entry-template").content.firstElementChild as HTMLElement;
    journalArea = document.getElementById("journals");
    createButton = document.getElementById("create-journal");
    createIcon = document.getElementById("create-icon");
    journalIcons = [];
    for (let type of journalTypes) {
        document.getElementById(type + "Journal")
        .addEventListener("click", (event: MouseEvent) => {
            newJournal(type);
        })
    }
    
    let journalIconSize = createIcon.clientHeight;
    maxSelectionHeight = journalIconSize * createButton.childElementCount;
    typeSelectionSpeed = 100;

    createButton.addEventListener("mouseenter", openJournalSelection);
    createButton.addEventListener("mouseleave", closeJournalSelection);
    await dbInit();
    await loadJournals();
    
    console.log(journalIcons);
});

function openJournalSelection() {
    createButton.animate(
        {
            height: ["75px", `${maxSelectionHeight}px`]
        },
        {
            duration: typeSelectionSpeed,
            fill: "forwards"
        }
    );

    createIcon.animate(
        {
            transform: ["rotate(0deg)", "rotate(180deg)"]
        },
        {
            duration: typeSelectionSpeed,
            fill: "forwards"
        }
    );
}

function closeJournalSelection() {
    createButton.animate(
        {
            height: [`${maxSelectionHeight}px`, "75px"]
        },
        {
            duration: typeSelectionSpeed,
            fill: "forwards"
        }
    );

    createIcon.animate(
        {
            transform: ["rotate(180deg)", "rotate(0deg)"]
        },
        {
            duration: typeSelectionSpeed,
            fill: "forwards"
        }
    );
}

function newJournal(type: string) {
    const title = getDate(Date.now());
    createJournal(title, type)
    .then(id => openJournal(id, type));
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
    
    entry.addEventListener("click", event => {
        let element  = event.target as HTMLElement;
        let entryID = element.attributes.getNamedItem("data-entryid").value;
        let type = element.attributes.getNamedItem("data-type").value;
        openJournal(entryID, type);
    });
    entry.dataset.entryid = journal.id;
    entry.dataset.type = journal.type;
    
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

function openJournal(entryID: string, type: string) {
    window.location.href = window.location.origin + `/journals/${type}.html` + "#entryid=" + entryID;
}