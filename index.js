// --- index.js (UPDATED FOR RENDER DEPLOYMENT) ---

const login = require("fca-unofficial");
const fs = require("fs");
const express = require("express");

console.log("Starting bot...");

// --- CONFIGURATION ---
let config;
try {
    config = require("./config.json");
} catch (error) {
    console.error("--> FATAL ERROR: config.json not found. Please create one based on the example.");
    process.exit(1);
}

// --- DYNAMIC MESSAGES FROM CONFIG ---
const menuMessage = `👋 Hello! Welcome to ${config.botName}.

🛒 You can:
1️⃣ View Products
2️⃣ Check Prices
3️⃣ Place an Order
4️⃣ Contact Admin

Please type the number of your choice or type 'menu' anytime to see this list again.`;

const productList = config.products.map(p => `🔹 ${p.name}: ${p.description}`).join('\n');
const productsMessage = `Here are our products:\n\n${productList}\n\nType 'menu' to go back.`;

const priceList = config.products.map(p => `💰 ${p.name} - ${p.price}`).join('\n');
const pricesMessage = `Here is our price list:\n\n${priceList}\n\nType 'menu' to go back.`;

const orderMessage = `📝 To place an order, please send us:
- Product Name
- Quantity
- Your complete shipping address
- Screenshot of payment with GCash Reference Number

We will confirm your order shortly.`;

const adminMessage = `📞 You can contact the admin here:
Name: ${config.adminInfo.name}
Facebook: ${config.adminInfo.facebook}
GCash for Payment: ${config.adminInfo.gcash}`;

const fallbackMessage = "❓ Sorry, I didn’t understand that.\nPlease type ‘menu’ to see options.";

const appStatePath = "appstate.json";

// --- LOGIN AND BOT LOGIC ---
function startBot() {
    let loginOptions = {};

    // PRIORITY: Use environment variable for appstate if it exists
    if (process.env.APPSTATE) {
        console.log("--> Logging in with environment variable APPSTATE...");
        loginOptions.appState = JSON.parse(process.env.APPSTATE);
    }
    // FALLBACK: Use local appstate.json file
    else if (fs.existsSync(appStatePath)) {
        console.log("--> Logging in with saved appstate.json file...");
        loginOptions.appState = JSON.parse(fs.readFileSync(appStatePath, 'utf8'));
    }
    // LAST RESORT: Use credentials from config.json
    else {
        console.log("--> Logging in with credentials...");
        loginOptions = { email: config.credentials.email, password: config.credentials.password };
    }

    login(loginOptions, (err, api) => {
        if (err) {
            console.error("--> Login failed:", err.error);
            if (err.error === 'login-approval') {
                console.log("--> 2FA is required. Cannot handle this on a server. Please generate appstate.json locally and set the APPSTATE environment variable on your hosting platform.");
            }
            return process.exit(1); // Exit if login fails
        }

        // Save the session state for local development, but it won't be used by Render
        fs.writeFileSync(appStatePath, JSON.stringify(api.getAppState(), null, 2));
        console.log(`--> Logged in as ${api.getCurrentUserID()}!`);

        api.listenMqtt((err, event) => {
            if (err) {
                console.error("--> Listen error:", err);
                // If listen error is 'Not logged in', restart the bot process
                if (err.error === 'Not logged in') {
                    console.error("--> Session appears to be invalid. Restarting bot...");
                    process.exit(1); // Exit with an error code, Render should restart it.
                }
                return;
            }

            if (event.type !== "message" || !event.body || event.isGroup || event.senderID === api.getCurrentUserID()) {
                return;
            }

            const message = event.body.toLowerCase().trim();
            console.log(`Received message from ${event.senderID}: "${message}"`);

            if (['hi', 'hello', 'menu'].includes(message)) {
                api.sendMessage(menuMessage, event.threadID, event.messageID);
            }
            else if (message === "1" || message.includes("view product")) {
                api.sendMessage(productsMessage, event.threadID, event.messageID);
            }
            else if (message === "2" || message.includes("check price")) {
                api.sendMessage(pricesMessage, event.threadID, event.messageID);
            }
            else if (message === "3" || message.includes("place an order")) {
                api.sendMessage(orderMessage, event.threadID, event.messageID);
            }
            else if (message === "4" || message.includes("contact admin")) {
                api.sendMessage(adminMessage, event.threadID, event.messageID);
            }
            else {
                api.sendMessage(fallbackMessage, event.threadID, event.messageID);
            }
        });
    });
}

// --- UPTIME SERVER ---
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send(`${config.botName} is online!`));
app.listen(port, () => console.log(`--> Uptime server listening on http://localhost:${port}`));

// --- START THE BOT ---
startBot();
