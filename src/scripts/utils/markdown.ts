interface StyleElement {
    startToken: string
    endToken: string
    toHtml: (content: string) => string
}

interface StyleSection {
    style: StyleElement
    children: StyleElement[]
}

export function markdownToHTML(content: string): string {
    return content;
}