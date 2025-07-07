// --- index.js (UPDATED TO REMOVE HTML DEPENDENCY) ---

const { spawn } = require("child_process");
const logger = require("./utils/log");

///////////////////////////////////////////////////////////
//========= Create website for dashboard/uptime =========//
///////////////////////////////////////////////////////////
const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

// Serve a simple text response instead of a file
app.get('/', (req, res) => {
    res.send('Bot is running!');
});

app.listen(port, () => {
    logger(`Uptime server is running on port ${port}`, "[ UPTIME ]");
});


/////////////////////////////////////////////////////////
//========= Create start bot and make it loop =========//
/////////////////////////////////////////////////////////
function startBot() {
    const child = spawn("node", ["--trace-warnings", "--async-stack-traces", "Priyansh.js"], {
        cwd: __dirname,
        stdio: "inherit",
        shell: true
    });

    child.on("close", (code) => {
        // A code of 1 is a general error, we'll try to restart.
        if (code === 1) {
            logger("Bot process exited. Restarting...", "[ RESTART ]");
            startBot();
        } else {
             logger("Bot has stopped.", "[ STOPPED ]");
        }
    });

    child.on("error", (error) => {
        logger(`An error occurred in the bot process: ${JSON.stringify(error)}`, "[ ERROR ]");
    });
};

startBot();
