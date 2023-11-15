import { Journal, appendToJournal, dbInit, getJournal } from "../../scripts/utils/storage";
import { TinyMCE } from "../../tinymce/js/tinymce/tinymce";

let entryID: string;
let journal: Journal;

declare const tinymce: TinyMCE;

window.addEventListener("load", async () => {
    await dbInit();
    entryID = parseHash().entryid;
    journal = await getJournal(entryID);
    setTitle(journal.created);
    tinymce.init({
        selector: "#editor",
        skin: "oxide-dark",
        content_css: "dark"
    });
});

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