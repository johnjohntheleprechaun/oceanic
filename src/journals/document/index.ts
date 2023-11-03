import { Journal, appendToJournal, dbInit, getJournal } from "../../scripts/utils/storage";

let entryID: string;
let journal: Journal;
let pages: HTMLDivElement[];
let editor: HTMLDivElement;

window.addEventListener("load", async () => {
    await dbInit();
    entryID = parseHash().entryid;
    journal = await getJournal(entryID);
    setTitle(journal.created);
    editor = document.getElementById("editor") as HTMLDivElement;
    pages = Array.from(editor.children) as HTMLDivElement[];

    setPageSizes();
    updateContent();
});
window.addEventListener("resize", function() {
    setPageSizes();
});

function updateContent() {
    const content = `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Facilisis leo vel fringilla est. Vitae congue mauris rhoncus aenean vel elit scelerisque mauris pellentesque. Tempus egestas sed sed risus pretium quam. Dolor sit amet consectetur adipiscing elit ut. Id porta nibh venenatis cras sed felis. Ornare arcu dui vivamus arcu felis bibendum ut tristique. Fermentum odio eu feugiat pretium nibh ipsum. Et pharetra pharetra massa massa. Magna eget est lorem ipsum dolor sit. Tortor condimentum lacinia quis vel eros.\n\n`.repeat(100);
    const paragraphs = content.split(/\n+/);
    for (const paragraph of paragraphs) {
        const page = pages[pages.length-1].children.item(0) as HTMLDivElement;
        const prevText = page.innerText
        page.innerText += paragraph;
        if (page.scrollHeight > page.clientHeight) {
            page.innerText = prevText;
            const newPage = pages[pages.length-1].cloneNode(true) as HTMLDivElement;
            (newPage.children.item(0) as HTMLDivElement).innerText = paragraph;
            editor.appendChild(newPage);
            pages.push(newPage);
        }
    }
}

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