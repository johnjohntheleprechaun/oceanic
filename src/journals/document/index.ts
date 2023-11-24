import { navbarInit } from "../../scripts/utils/navbar";
import { Journal } from "../../scripts/utils/storage";
import { Editor, TinyMCE } from "../../tinymce/js/tinymce/tinymce";

let entryID: string;
let journal: Journal;

declare const tinymce: TinyMCE;

window.addEventListener("load", async () => {
    entryID = parseHash()["entryid"];
    journal = new Journal(entryID);
    loadTinyMCE();
    navbarInit(journal);
    window.setTimeout(saveDoc, 5000);
});
window.addEventListener("beforeunload", async (e) => {
    if (await journal.getContent() !== tinymce.activeEditor.getContent()) {
        e.preventDefault();
    }
});

function loadTinyMCE() {
    const script = document.createElement("script") as HTMLScriptElement;
    script.src = "/tinymce/tinymce.min.js";
    script.addEventListener("load", () => {
        tinymce.init({
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
    });
    document.body.appendChild(script);
}

async function saveDoc() {
    let content = tinymce.activeEditor.getContent();
    if (await journal.getContent() !== content) {
        journal.setContent(content);
        console.log("saved new content");
    }
    window.setTimeout(saveDoc, 5000);
}

async function editorSetup(editor: Editor) {
    const journalContent = await journal.getContent();
    editor.on("init", function(e) {
        editor.setContent(journalContent);
        editor.focus();
    });
    editor.on("keydown", function(e) {
        if (e.ctrlKey && e.key === "s") {
            e.preventDefault();
            saveDoc();
        }
    });
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