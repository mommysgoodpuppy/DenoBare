console.log("Starting long-running script...");

let counter = 0;

function incrementCounter() {
    counter++;
    console.log(`Counter: ${counter}`);
    if (counter < 5) {
        setTimeout(incrementCounter, 1000);
    } else {
        console.log("Long-running script finished.");
    }
}

console.log("Setting up timer...");
setTimeout(incrementCounter, 1000);

console.log("Script setup complete. Waiting for events...");