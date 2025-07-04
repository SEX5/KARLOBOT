// --- Priyansh.js (FINAL CORRECTED VERSION) ---

const { readdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } = require("fs-extra");
const { join, resolve } = require("path");
const logger = require("./utils/log.js");
const login = require("fca-unofficial");

// --- GLOBAL OBJECTS ---
global.client = {
    commands: new Map(),
    cooldowns: new Map(),
    handleReaction: new Array(),
    handleReply: new Array(),
    mainPath: process.cwd(),
    configPath: join(process.cwd(), "config.json"),
    timeStart: Date.now()
};
global.utils = require("./utils");
global.config = {};

// --- LOAD CONFIGURATION (Step 1) ---
try {
    const configValue = require(global.client.configPath);
    Object.assign(global.config, configValue);
    logger.loader("Config loaded successfully!");
} catch (e) {
    return logger.loader("Cannot load config.json! " + e.message, "error");
}

// --- INITIALIZE DATABASE (Step 2 - MOVED TO HERE) ---
const { Sequelize, sequelize } = require("./includes/database")(global.config.DATABASE);

// --- LOGIN FUNCTION ---
function onBotLogin(models) {
    const appStateFile = resolve(join(global.client.mainPath, global.config.APPSTATEPATH || "appstate.json"));
    let loginOptions = {};

    // Prioritize Environment Variable (for hosting) then fallback to file
    if (process.env.APPSTATE) {
        try {
            loginOptions.appstate = JSON.parse(process.env.APPSTATE);
            logger.loader("Logging in with APPSTATE from environment variable...");
        } catch (e) {
            return logger.loader("Failed to parse APPSTATE environment variable. " + e, "error");
        }
    }
    // Fallback to appstate.json file
    else if (existsSync(appStateFile)) {
        try {
            loginOptions.appstate = JSON.parse(readFileSync(appStateFile, 'utf8'));
            logger.loader("Logging in with appstate.json file...");
        } catch (e) {
            unlinkSync(appStateFile); // Delete corrupted file
            return logger.loader("Corrupted appstate.json, deleted. Please login again with credentials.", "error");
        }
    }
    // Fallback to credentials (for local first-time login)
    else {
        loginOptions = { email: global.config.EMAIL, password: global.config.PASSWORD };
        logger.loader("No appstate found. Logging in with credentials...");
    }
    
    login(loginOptions, (loginError, api) => {
        if (loginError) {
            if (loginError.error === 'login-approval') {
                console.log("Enter the 2FA code you received:");
                process.stdin.once('data', (data) => {
                    try {
                        loginError.continue(data.toString().trim());
                    } catch(e) { console.error("2FA submission failed:", e) }
                });
            } else {
                 return console.error("Login Error:", loginError);
            }
            return;
        }

        // Save the fresh session state back to a local file (for local use)
        writeFileSync(appStateFile, JSON.stringify(api.getAppState(), null, 4));
        api.setOptions(global.config.FCAOption);
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
            return listener(event);
        });
    });
}

// --- DATABASE CONNECTION AND BOT STARTUP ---
(async () => {
    try {
        await sequelize.authenticate();
        
        // Define the 'sets' model directly on the sequelize instance
        const setsModel = sequelize.define('sets', {
            name: { type: Sequelize.STRING, primaryKey: true, allowNull: false },
            price: { type: Sequelize.FLOAT, allowNull: false },
            description: { type: Sequelize.TEXT, allowNull: true }
        });
        // We will also add the users table from the original logic for compatibility
        const usersModel = sequelize.define('users', {
            userID: { type: Sequelize.STRING, primaryKey: true, allowNull: false }
        });

        await sequelize.sync({ force: false });

        logger.loader("Database connected and models synchronized.", '[ DATABASE ]');
        
        // Pass all defined models to the bot
        onBotLogin({ models: sequelize.models });

    } catch (error) {
        logger.loader(`Database or startup failed: ${error}`, '[ ERROR ]');
    }
})();
