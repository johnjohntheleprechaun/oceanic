import { Journal, appendToJournal, dbInit, getJournal, updateJournal } from "../../scripts/utils/storage";
import { Editor, TinyMCE } from "../../tinymce/js/tinymce/tinymce";

let entryID: string;
let journal: Journal;

declare const tinymce: TinyMCE;

window.addEventListener("load", async () => {
    await dbInit();
    entryID = parseHash().entryid;
    journal = await getJournal(entryID);
    setTitle(journal.created);
    await tinymce.init({
        selector: "#editor",
        menubar: false,
        statusbar: false,
        skin: "oceanic",
        content_css: "oceanic",
        elementpath: false,
        toolbar: "styles | bold italic underline strikethrough | alignleft aligncenter alignright | bullist numlist outdent indent | quickimage table link",
        toolbar_mode: "floating",
        resize: false,
        quickbars_insert_toolbar: false,
        plugins: "wordcount link autolink emoticons image lists quickbars searchreplace table",
        mobile: {
            toolbar_mode: "sliding"
        },
        setup: editorSetup
    });
    window.setTimeout(saveDoc, 5000);
});
window.addEventListener("beforeunload", (e) => {
    if (journal.content !== tinymce.activeEditor.getContent()) {
        e.preventDefault();
    }
});

async function saveDoc() {
    let content = tinymce.activeEditor.getContent();
    if (journal.content !== content) {
        journal.content = content;
        await updateJournal(entryID, content);
        console.log("saved new content");
    }
    window.setTimeout(saveDoc, 5000);
}

async function editorSetup(editor: Editor) {
    editor.on("init", function(e) {
        editor.setContent(journal.content);
    });
    editor.on("keydown", function(e) {
        if (e.ctrlKey && e.key === "s") {
            e.preventDefault();
            saveDoc();
        }
    });
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