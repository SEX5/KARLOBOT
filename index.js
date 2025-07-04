// --- DEPENDENCIES ---
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

const appStatePath = "appstate.json";

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

// --- LOGIN AND BOT LOGIC ---
function startBot() {
    let loginOptions;
    if (fs.existsSync(appStatePath)) {
        console.log("--> Logging in with saved appstate...");
        loginOptions = { appState: JSON.parse(fs.readFileSync(appStatePath, 'utf8')) };
    } else {
        console.log("--> Logging in with credentials...");
        loginOptions = { email: config.credentials.email, password: config.credentials.password };
    }

    login(loginOptions, (err, api) => {
        if (err) {
            console.error("--> Login failed:", err.error);
            if (err.error === 'login-approval') {
                console.log("--> Enter the 2FA code you received:");
                process.stdin.once('data', (data) => {
                    err.continue(data.toString().trim());
                });
            } else {
                 if (fs.existsSync(appStatePath)) {
                     fs.unlinkSync(appStatePath);
                     console.log("--> Deleted invalid appstate.json. Please restart the bot to log in with credentials.");
                 }
                 process.exit(1);
            }
            return;
        }

        fs.writeFileSync(appStatePath, JSON.stringify(api.getAppState(), null, 2));
        console.log(`--> Logged in as ${api.getCurrentUserID()}!`);

        api.listenMqtt((err, event) => {
            if (err) return console.error("--> Listen error:", err);

            // Filter for valid messages in private chats only
            if (event.type !== "message" || !event.body || event.isGroup) {
                return;
            }

            const message = event.body.toLowerCase().trim();
            const senderID = event.senderID;

            // Don't reply to yourself
            if (senderID === api.getCurrentUserID()) {
                return;
            }

            console.log(`Received message from ${senderID}: "${message}"`);

            // Main menu navigation logic
            if (['hi', 'hello', 'menu'].includes(message)) {
                api.sendMessage(menuMessage, event.threadID, event.messageID);
            }
            // 1. View Products
            else if (message === "1" || message.includes("view product")) {
                api.sendMessage(productsMessage, event.threadID, event.messageID);
            }
            // 2. Check Prices
            else if (message === "2" || message.includes("check price")) {
                api.sendMessage(pricesMessage, event.threadID, event.messageID);
            }
            // 3. Place an Order
            else if (message === "3" || message.includes("place an order")) {
                api.sendMessage(orderMessage, event.threadID, event.messageID);
            }
            // 4. Contact Admin
            else if (message === "4" || message.includes("contact admin")) {
                api.sendMessage(adminMessage, event.threadID, event.messageID);
            }
            // Fallback for unrecognized commands
            else {
                api.sendMessage(fallbackMessage, event.threadID, event.messageID);
            }
        });
    });
}

// --- UPTIME SERVER (for services like Replit, Glitch, etc.) ---
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send(`${config.botName} is online!`));
app.listen(port, () => console.log(`--> Uptime server listening on http://localhost:${port}`));

// --- START THE BOT ---
startBot();
