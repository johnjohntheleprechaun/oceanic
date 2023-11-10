import { Journal, appendToJournal, dbInit, getJournal } from "../../scripts/utils/storage";

let entryID: string;
let journal: Journal;
let pages: HTMLDivElement[];
let editor: HTMLDivElement;
let pageTemplate: HTMLDivElement;

window.addEventListener("load", async () => {
    await dbInit();
    entryID = parseHash().entryid;
    journal = await getJournal(entryID);
    setTitle(journal.created);
    editor = document.getElementById("editor") as HTMLDivElement;
    pages = [editor.children.item(0) as HTMLDivElement];
    setPageSizes();
    
    pageTemplate = pages[0].cloneNode(true) as HTMLDivElement;

    loadContent();
    pages.forEach((page, index) => {
        page.addEventListener("input", e => {
            updateContentFrom(index);
        });
    });
});
window.addEventListener("resize", function() {
    setPageSizes();
});

function getPageContent(pageIndex: number): HTMLDivElement {
    return pages[pageIndex].children.item(0) as HTMLDivElement;
}
function updateContentFrom(pageIndex: number) {
    for (let i = pageIndex; i < pages.length; i++) {
        const pageContent = getPageContent(i);

        if (pageContent.clientHeight < pageContent.scrollHeight) {
            const lastParagraph = pageContent.children.item(pageContent.childElementCount-1);
            console.log(lastParagraph.textContent);
            console.log(document.getSelection());
            console.log(document.getSelection().getRangeAt(0));
            lastParagraph.remove();
            const nextPage = getPageContent(i+1);
            nextPage.insertBefore(lastParagraph, nextPage.children.item(0));
        }
    }
}
function loadContent() {
    const content = `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Facilisis leo vel fringilla est. Vitae congue mauris rhoncus aenean vel elit scelerisque mauris pellentesque. Tempus egestas sed sed risus pretium quam. Dolor sit amet consectetur adipiscing elit ut. Id porta nibh venenatis cras sed felis. Ornare arcu dui vivamus arcu felis bibendum ut tristique. Fermentum odio eu feugiat pretium nibh ipsum. Et pharetra pharetra massa massa. Magna eget est lorem ipsum dolor sit. Tortor condimentum lacinia quis vel eros.\n\n`.repeat(10);
    const paragraphs = splitParagraphs(content);
    for (const paragraph of paragraphs) {
        const pageContent = pages[pages.length-1].children.item(0) as HTMLDivElement;

        // Create paragraph span
        const paragraphElement = document.createElement("div");
        paragraphElement.innerText = paragraph;

        pageContent.appendChild(paragraphElement);
        if (pageContent.scrollHeight > pageContent.clientHeight) {
            pageContent.removeChild(paragraphElement);
            const newPage = pageTemplate.cloneNode(true) as HTMLDivElement;
            newPage.children[0].appendChild(paragraphElement);
            editor.appendChild(newPage);
            pages.push(newPage);
        }
    }
}

function splitParagraphs(text: string): string[] {
    const output: string[] = [];
    let lastSplit = 0;
    for (let i = 0; i < text.length; i++) {
        if (text[i] === "\n") { 
            output.push(text.slice(lastSplit, i+1));
            lastSplit = i+1;
        }
    }

    return output;
}

function setPageSizes() {
    let pages = Array.from(document.getElementsByClassName("page")) as HTMLDivElement[];

    // one font point is 1/72 inch
    const fontSize = 12;
    const marginInches = 1;
    const ppi = pages[0].offsetHeight / 11;
    const fontPixels = ppi * (fontSize / 72);
    const marginPixels = marginInches * ppi;
    for (const page of pages) {
        page.style.padding = marginPixels + "px";
        page.style.fontSize = fontPixels + "px";
    }
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