import { AWSConnection } from "./utils/aws";

async function test() {
    const cloud = AWSConnection.fromLocalStorage();
    await cloud.putDynamoItem("asdfasdf", { test: "hello world"});
    await cloud.putS3Object();
}

export {test}