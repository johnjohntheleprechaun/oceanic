import { Journal, appendToJournal, dbInit, getJournal } from "../../scripts/utils/storage";
//const css = require("css/journal.css");

let messageArea: HTMLElement;
let messageTemplate: DocumentFragment;
let inputField: HTMLTextAreaElement;
let entryID: string;
const maxLines = 5;

window.addEventListener("load", async () => {
    messageArea = document.getElementById("messages");
    messageTemplate = (document.getElementById("message-template") as HTMLTemplateElement).content;
    inputField = document.getElementById("input-field") as HTMLTextAreaElement;
    inputField.addEventListener("input", resizeInputField);
    
    document.getElementById("submit").addEventListener("mousedown", e => {
        e.preventDefault();
        addMessage();
    });
    
    await dbInit();
    await loadJournal();

    document.body.style.height = visualViewport.height + "px";
});

window.addEventListener("resize", () => {
    document.body.style.height = visualViewport.height + "px";
    messageArea.scrollTop = messageArea.scrollHeight;
});

window.addEventListener("keydown", e => {
    if (document.activeElement === inputField && e.code === "Enter" && !e.shiftKey) {
        e.preventDefault();
        addMessage();
    }
});


function resizeInputField() {
    inputField.rows = 1;
    while (inputField.clientHeight < inputField.scrollHeight && inputField.rows < maxLines) {
        inputField.rows += 1;
    }
    inputField.scrollTop = inputField.scrollHeight;
}

function setTitle(timestamp: number) {
    let date = new Date(timestamp);
    let title = (date.getMonth() + 1).toString().padStart(2,"0") + "/" + date.getDate().toString().padStart(2,"0") + "/" + date.getFullYear();
    document.getElementById("journal-title").innerText = title;
}

function parseHash() {
    const hash = window.location.hash.substring(1);
    const pairs = hash.split('&');
    const result: any = {};
    for (const pair of pairs) {
      const [key, val] = pair.split('=');
      result[key] = decodeURIComponent(val);
    }
    return result;
  }
  

function pickJournal() {
    entryID = parseHash().entryid;
}

async function loadJournal() {
    pickJournal();
    messageArea.innerHTML = "";
    const journal = await getJournal(entryID);
    setTitle(journal.created);
    displayJournal(journal);
}

function displayJournal(journal: Journal) {
    displayMessageJournal(journal.content);
}

function displayMessageJournal(content: string) {
    const regex = /{(\d+)} (.+)/gm;
    let m;
    while ((m = regex.exec(content)) !== null) {
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }
        displayMessage(m[2], parseInt(m[1]));
    }
}

async function addMessage() {
    if (inputField.value !== "") {
        const timestamp = Date.now();
        // append message to journal
        let content = inputField.value.replace(/\n/g, "\\n");
        await appendToJournal(entryID, `{${timestamp}} ${content}\n`);
        displayMessage(inputField.value, timestamp);
        inputField.value = "";
        inputField.rows = 1;
    }
}

function displayMessage(content: string, timestamp: number) {
    let message = messageTemplate.cloneNode(true) as HTMLElement;
    let date = new Date(timestamp);
    content = content.replace(/\\n/g, "\n");

    // add text and timestamp to message
    message.querySelector<HTMLElement>(".message").innerText = content;
    message.querySelector<HTMLElement>(".time").innerText = date.getHours().toString().padStart(2,"0") + ":" + date.getMinutes().toString().padStart(2,"0") + ":" + date.getSeconds().toString().padStart(2,"0");
    message.querySelector<HTMLElement>(".date").innerText = (date.getMonth() + 1).toString().padStart(2,"0") + "/" + date.getDate().toString().padStart(2,"0") + "/" + date.getFullYear();
    
    // append and scroll to bottom
    messageArea.appendChild(message);
    messageArea.scrollTop = messageArea.scrollHeight;
}