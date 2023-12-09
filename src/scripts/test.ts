import { JournalDatabase } from "./utils/storage"

async function test() {
    const db = new JournalDatabase();
    db.execOperation(two, [], "readonly");
    db.execOperation(one, [], "readonly");
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