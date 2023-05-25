import { dynamoPutItem, dynamoQuery, utilsInit } from "./utils/aws";

const url = "https://4bwtjf5ctmo527paml7vdxnwnq0yhiuf.lambda-url.us-west-2.on.aws/journals/";

let messageArea;
let messageTemplate;
let inputField;
let entryID
const maxLines = 5;

window.addEventListener("load", utilsInit);

window.addEventListener("load", () => {
    messageArea = document.getElementById("messages");
    messageTemplate = document.getElementById("message-template").content;
    inputField = document.getElementById("input-field");
    inputField.addEventListener("input", resizeInputField);
    
    document.getElementById("submit").addEventListener("mousedown", e => {
        e.preventDefault();
        sendMessage();
    })

    pickJournal();
    loadJournal();

    document.body.style.height = visualViewport.height + "px";
});

window.addEventListener("resize", () => {
    document.body.style.height = visualViewport.height + "px";
    messageArea.scrollTop = messageArea.scrollHeight;
});

window.addEventListener("keydown", e => {
    if (document.activeElement === inputField && e.code === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
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
    messageArea.innerHTML = "";
    const params = {
        TableName: "journal-messages",
        KeyConditionExpression: "entryID = :eID",
        ExpressionAttributeValues: {
            ":eID": { S: entryID }
        }
    };
    const messages = await dynamoQuery(params);
    setMessages(messages);
}

function setMessages(data) {
    // THIS IS NOT A GOOD FIX, PLEASE DO SOMETHING BETTER LATER
    if (data.length > 0) {
        setTitle(parseInt(data[0].timestamp.N));
    } else {
        setTitle(Date.now());
    }
    data.forEach(message => addMessage(message.message.S, parseInt(message.timestamp.N)));
}

async function sendMessage() {
    if (inputField.value !== "") {
        const timestamp = Date.now();
        // send message to server
        const params = {
            TableName: "journal-messages",
            Item: {
                entryID: { S: entryID },
                timestamp: { N: timestamp.toString() },
                message: { S: inputField.value }
            }
        };
        await dynamoPutItem(params);
        addMessage(inputField.value, timestamp);

        inputField.value = "";
    }
}

function addMessage(content, timestamp) {
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