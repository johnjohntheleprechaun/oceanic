import { appendToJournal, dbInit, getJournal } from "./utils/storage";

let messageArea;
let messageTemplate;
let inputField;
let entryID
const maxLines = 5;

window.addEventListener("load", async () => {
    messageArea = document.getElementById("messages");
    messageTemplate = document.getElementById("message-template").content;
    inputField = document.getElementById("input-field");
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
    inputField.rows = Math.min((inputField.value.match(/\n/g) || []).length + 1, maxLines);
    inputField.scrollTop = inputField.scrollHeight;
}

function setTitle(timestamp) {
    console.log(timestamp);
    let date = new Date(timestamp);
    let title = (date.getMonth() + 1).toString().padStart(2,"0") + "/" + date.getDate().toString().padStart(2,"0") + "/" + date.getFullYear();
    document.getElementById("journal-title").innerText = title;
}

function parseHash() {
    const hash = window.location.hash.substring(1);
    const pairs = hash.split('&');
    const result = {};
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

function displayJournal(journal) {
    displayMessageJournal(journal.content);
}

function displayMessageJournal(content) {
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
        await appendToJournal(entryID, `{${timestamp}} ${inputField.value}\n`);
        displayMessage(inputField.value, timestamp);
        inputField.value = "";
    }
}

function displayMessage(content, timestamp) {
    let message = messageTemplate.cloneNode(true);
    let date = new Date(timestamp);

    // add text and timestamp to message
    message.querySelector(".message").innerText = content;
    message.querySelector(".time").innerText = date.getHours().toString().padStart(2,"0") + ":" + date.getMinutes().toString().padStart(2,"0") + ":" + date.getSeconds().toString().padStart(2,"0");
    message.querySelector(".date").innerText = (date.getMonth() + 1).toString().padStart(2,"0") + "/" + date.getDate().toString().padStart(2,"0") + "/" + date.getFullYear();
    
    // append and scroll to bottom
    messageArea.appendChild(message);
    messageArea.scrollTop = messageArea.scrollHeight;
}