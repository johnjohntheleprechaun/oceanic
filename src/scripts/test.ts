import { JournalDatabase } from "./utils/storage"

async function test() {
    const db = new JournalDatabase();
    let id: string;
    for await (let journal of db.listJournals()) {
        journal.setTitle("chimken");
        id = journal.id;
    }
    const journal = await db.getJournal(id);
    console.log(journal);
}

async function one() {
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log("one");
}

async function two() {
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log("two");
}

export {test}