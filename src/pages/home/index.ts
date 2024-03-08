import * as JSZip from "jszip";
import { JournalDatabase, Journal } from "../../scripts/utils/storage";

declare const JOURNALS: string[];
const journalTypes = JOURNALS;

let journalIcons: HTMLElement[];
let entryTemplate: HTMLElement;
let journalArea: HTMLElement;
let createButton: HTMLElement;
let createIcon: HTMLElement;
let typeSelectionSpeed: number;
let maxSelectionHeight: number;
let db: JournalDatabase

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
    db = new JournalDatabase();
    await loadJournals();
    
    console.log(journalIcons);

    document.getElementById("page-title").addEventListener("click", exportAll);
});

async function exportAll() {
    const zip = new JSZip();
    const usedNames: string[] = [];
    for await (const journal of db.listJournals()) {
        const content = JSON.stringify(journal.journal);
        const blob = new Blob([content], { type: "application/json" });
        const title = await journal.getTitle() === "" ? "untitled" : await journal.getTitle();

        // prevent repeat names
        let filename;
        if (usedNames.includes(title)) {
            filename = `${title} (${usedNames.filter(x=>x===title).length}).json`
        } else {
            filename = `${title}.json`
        }
        usedNames.push(title);

        // create export link
        zip.file(filename, blob);
    }
    zip.generateAsync({type: "blob"}).then(blob => {
        // create object URL
        const url = URL.createObjectURL(blob);

        // create link element
        const link = document.createElement("a");
        link.href = url;
        link.download = "journals.zip";
        link.style.display = "none";

        // trigger download
        document.body.appendChild(link);
        link.click();

        // cleanup
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });
}

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
    db.createJournal("", type)
    .then(id => openJournal(id, type));
}

async function loadJournals() {
    for await (const journal of db.listJournals()) {
        displayJournal(journal);
    }
}

async function displayJournal(journal: Journal) {
    let entry = entryTemplate.cloneNode(true) as HTMLElement;

    let displayTitle: string;
    if (await journal.getTitle() === "") {
        displayTitle = "Untitled";
    }
    else {
        displayTitle = await journal.getTitle();
    }
    entry.querySelector<HTMLSpanElement>(".title").textContent = displayTitle;
    entry.querySelector<HTMLElement>(".date").textContent = getDate(await journal.getCreated());
    
    entry.addEventListener("click", event => {
        let element  = event.target as HTMLElement;
        let entryID = element.attributes.getNamedItem("data-entryid").value;
        let type = element.attributes.getNamedItem("data-type").value;
        openJournal(entryID, type);
    });
    entry.dataset.entryid = journal.id;
    entry.dataset.type = await journal.getType();
    
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