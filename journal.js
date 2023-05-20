const url = "https://4bwtjf5ctmo527paml7vdxnwnq0yhiuf.lambda-url.us-west-2.on.aws/journals/";

let messageArea;
let messageTemplate;
let inputField;
let entryID

window.addEventListener("load", () => {token = loadToken()});
window.addEventListener("load", () => {
    messageArea = document.getElementById("messages");
    messageTemplate = document.getElementById("message-template").content;
    inputField = document.getElementById("input-field");
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
})

function setTitle(timestamp) {
    console.log(timestamp);
    let date = new Date(timestamp);
    console.log(date);
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
    // THIS IS NOT A GOOD FIX, PLEASE DO SOMETHING BETTER LATER
    if (data.length > 0) {
        setTitle(data[0].timestamp);
    } else {
        setTitle(Date.now());
    }
}

function sendMessage() {
    if (inputField.innerText !== "") {
        // send message to server
        const data = {
            "message": inputField.innerText
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

        inputField.innerText = "";
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