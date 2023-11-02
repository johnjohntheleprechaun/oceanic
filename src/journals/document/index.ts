import { Journal, appendToJournal, dbInit, getJournal } from "../../scripts/utils/storage";

let entryID: string;
let journal: Journal;
let pages: HTMLCollectionOf<Element>;

window.addEventListener("load", async () => {
    await dbInit();
    entryID = parseHash().entryid;
    journal = await getJournal(entryID);
    setTitle(journal.created);
    pages = document.getElementsByClassName("page");

    setPageSizes();
});
window.addEventListener("resize", function() {
    setPageSizes();
});


function setPageSizes() {
    let page = document.getElementsByClassName("page").item(0) as HTMLDivElement;

    // one font point is 1/72 inch
    const fontSize = 12;
    const marginInches = 1;
    const ppi = page.offsetHeight / 11;
    const fontPixels = ppi * (fontSize / 72);
    const marginPixels = marginInches * ppi;
    page.style.padding = marginPixels + "px";
    page.style.fontSize = fontPixels + "px";
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