const irc = require("irc");
const fs = require("fs");

const config = require("./config.json");

const capsuleLogsDir = config.logsDirectory;

let currentCapsuleLogsPath = null;
let currentCapsuleLogsStream = null;

let lastNotificationTime = null;

function getTimestamp(date) {
    return (date || new Date()).toISOString().slice(0, 19) + "Z";
}

function getCapsuleLogsPath(date) {
    timestamp = (date || new Date()).toISOString().split("-").slice(0, 2).join(".");
    path = `${capsuleLogsDir}/freenode.capsule-console.${timestamp}.txt`;
}

function getCapsuleLogsStream() {
    const expectedPath = getCapsuleLogsPath();
    if(!currentCapsuleLogsStream || !currentCapsuleLogsStream.writable ||
        currentCapsuleLogsPath != expectedPath
    ) {
        if(currentCapsuleLogsStream) {
            currentCapsuleLogsStream.end();
        }
        currentCapsuleLogsPath = expectedPath;
        currentCapsuleLogsStream = fs.createWriteStream(path, {flags: "a"});
    }
    if(!currentCapsuleLogsStream) {
        throw new Error("Failed to obtain file stream.");
    }
    return currentCapsuleLogsStream;
}

function appendCapsuleLogs(message) {
    stream = getCapsuleLogsStream();
    stream.write(`${getTimestamp()} ${message}\n`);
}

const client = new irc.Client("irc.freenode.net", config.userName, {
    userName: config.userName,
    realName: config.realName,
    password: config.password,
    port: 6667, 
    sasl: true,
    autoRejoin: false,
    autoConnect: false,
    retryCount: 3,
    retryDelay: 5000,
});

client.addListener("registered", function (message) {
    console.log(`Registered on ${message.server}: ${message.args.join(", ")}`);
});

client.addListener("topic", function (channel, topic, nick, message) {
    console.log(`Topic: ${message.args.join(", ")}`);
});

client.addListener("join", function (channel, nick, message) {
    console.log(`Joined ${channel} as ${nick}`);
});

client.addListener("part", function (channel, nick, reason, message) {
    console.log("Parted: ", message);
});

client.addListener("quit", function (nick, reason, channels, message) {
    console.log("Quit: ", message);
});

client.addListener("kick", function (channel, nick, by, reason, message) {
    console.log(`Kicked ${nick} from ${channel}`);
    // if(channel === "#capsule-console") {
    //     appendCapsuleLogs(
    //         `${nick} was kicked by ${by}` +
    //         (reason ? `(reason: ${reason})` : "") +
    //         (message ? `: ${message}` : "") +
    //     );
    // }
});

client.addListener("kill", function (nick, by, reason, message) {
    console.log("Killed: ", message);
});

client.addListener("notice", function (nick, to, text, message) {
    console.log(`Notice from ${nick}: ${message.args.join(", ")}`);
});

client.addListener("message", function (from, to, message) {
    console.log(`Message from ${from} to ${to}: ${message}`);
    if(to === "#capsule-console" || from === "#capsule-console") {
        appendCapsuleLogs(`${from}: ${message}`);
    }
});

// client.addListener("raw", function(event) {
//     console.log("Raw: ", event);
// });

client.addListener("error", function(message) {
    console.log("Error: ", message);
});

console.log("Connecting to chat.freenode.net");
client.connect(2, function() {
    console.log("Connected.");
    console.log("Joining #capsule-console");
    client.join("#capsule-console", function() {
        console.log("Joined.");
    });
});

function keepAlive(arg) {
  setTimeout(keepAlive, 10_000);
}

setTimeout(keepAlive, 10_000);
