// --- Priyansh.js (BUILT FOR FCA-UNOFFICIAL) ---

const { readdirSync, readFileSync, writeFileSync, existsSync } = require("fs-extra");
const { join, resolve } = require("path");
const logger = require("./utils/log.js");
const login = require("fca-unofficial"); // <-- Now using the new library
const { Sequelize, sequelize } = require("./includes/database")(global.config.DATABASE);

// --- GLOBAL OBJECTS ---
global.client = {
    commands: new Map(),
    handleReaction: [],
    handleReply: [],
    mainPath: process.cwd(),
    configPath: join(process.cwd(), "config.json"),
    timeStart: Date.now()
};
global.utils = require("./utils");
global.config = {};

// --- LOAD CONFIGURATION ---
try {
    const configValue = require(global.client.configPath);
    Object.assign(global.config, configValue);
    logger.loader("Config loaded successfully!");
} catch (e) {
    return logger.loader("Cannot load config.json! " + e.message, "error");
}

// --- MAIN BOT FUNCTION ---
function startBot(models) {
    const appStateFile = resolve(join(global.client.mainPath, global.config.APPSTATEPATH || "appstate.json"));
    let loginOptions = {};

    if (existsSync(appStateFile)) {
        try {
            loginOptions.appstate = JSON.parse(readFileSync(appStateFile, 'utf8'));
        } catch (e) {
            fs.unlinkSync(appStateFile);
            return logger.loader("Corrupted appstate.json, deleted. Please login with credentials.", "error");
        }
    } else {
        loginOptions = { email: global.config.EMAIL, password: global.config.PASSWORD };
    }

    login(loginOptions, (err, api) => {
        if (err) {
            // Handle 2FA by prompting user in console
            if (err.error === 'login-approval') {
                console.log("Enter the 2FA code you received:");
                process.stdin.once('data', (data) => {
                    try {
                        err.continue(data.toString().trim());
                    } catch (e) { console.error("2FA submission failed:", e); }
                });
            } else {
                return console.error("Login Error:", err);
            }
            return;
        }

        // Save the session state
        writeFileSync(appStateFile, JSON.stringify(api.getAppState(), null, 4));
        
        // The new API doesn't use the old FCAOption object, so we remove that call.
        global.client.api = api;

        // Load Commands
        const commandPath = join(global.client.mainPath, 'Priyansh/commands');
        const commandFiles = readdirSync(commandPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            try {
                const command = require(join(commandPath, file));
                if (command.config && command.run) {
                    global.client.commands.set(command.config.name, command);
                }
            } catch (e) {
                logger.loader(`Cannot load command ${file}: ${e}`, "error");
            }
        }
        logger.loader(`Loaded ${global.client.commands.size} commands.`);
        logger.loader(`Bot is ready. Startup time: ${((Date.now() - global.client.timeStart) / 1000).toFixed()}s`);

        // Start Listener
        const listener = require('./includes/listen')({ api, models });
        api.listenMqtt((err, event) => {
            if (err) return console.error("Listen MQTT Error:", err);
            listener(event);
        });
    });
}

// --- DATABASE AND STARTUP ---
(async () => {
    try {
        await sequelize.authenticate();
        const setsModel = sequelize.define('sets', {
            name: { type: Sequelize.STRING, primaryKey: true, allowNull: false },
            price: { type: Sequelize.FLOAT, allowNull: false },
            description: { type: Sequelize.TEXT, allowNull: true }
        });
        const usersModel = sequelize.define('users', {
            userID: { type: Sequelize.STRING, primaryKey: true, allowNull: false }
        });
        await sequelize.sync({ force: false });
        logger.loader("Database connected and models synchronized.", '[ DATABASE ]');
        
        startBot({ models: { sets: setsModel, users: usersModel } });

    } catch (error) {
        logger.loader(`Database or startup failed: ${error}`, '[ ERROR ]');
    }
})();
