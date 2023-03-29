const url = "https://4bwtjf5ctmo527paml7vdxnwnq0yhiuf.lambda-url.us-west-2.on.aws/journals/";

let messageArea;
let messageTemplate;
let inputField;
let entryID

window.addEventListener("load", () => {token = loadToken()})
window.addEventListener("load", () => {
    messageArea = document.getElementById("messages");
    messageTemplate = document.getElementById("message-template").content;
    inputField = document.getElementById("input-field");
    inputField.addEventListener("keydown", (e) => {
        if (e.code === "Enter") {
            sendMessage();
        }
    });
    pickJournal();
    loadJournal();
})
window.addEventListener("resize", () => {
    document.getElementsByTagName("html")[0].style.height = visualViewport.height + "px";
})

function pickJournal() {
    const url = new URL(window.location.href);
    entryID = url.searchParams.get("entryid");
}

function loadJournal() {
    messageArea.innerHTML = "";
    fetch(url + entryID, {
        method: "GET",
        headers: {
            "Authorization": "Bearer " + token
        }
    })
    .then(response => response.json())
    .then(setMessages)
    .catch(error => console.error(error));
}

function setMessages(data) {
    data.forEach(message => addMessage(message.message, message.timestamp));
}

function sendMessage() {
    if (inputField.value !== "") {
        // send message to server
        const data = {
            "message": inputField.value
        };
        fetch(url + entryID, {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(messageResponseHandler)
        .catch(error => console.error(error));

        inputField.value = "";
    }
}
function messageResponseHandler(data) {
    if (data.error !== undefined) {
        if (data.error === "invalid token") {
            let newToken = window.prompt("Invalid token, please enter a new one");
            window.localStorage.setItem("token", newToken);
        }
    }
    else {
        addMessage(data.message.message, data.message.timestamp);
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
