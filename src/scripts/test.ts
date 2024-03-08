import { JournalDatabase } from "./utils/storage"

async function test() {
    const db = new JournalDatabase();
    let id: string;
    for await (const journal of db.listJournals()) {
        console.log(journal);
        await journal.setType(await journal.getType() + "test");
    }
}

export {test}