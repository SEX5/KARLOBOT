// --- Priyansh.js (FINAL CORRECTED VERSION) ---

const { readdirSync, readFileSync, writeFileSync, existsSync } = require("fs-extra");
const { join, resolve } = require("path");
const logger = require("./utils/log.js");
const login = require("fca-priyansh");

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

// --- LOAD CONFIGURATION ---
try {
    const configValue = require(global.client.configPath);
    for (const key in configValue) global.config[key] = configValue[key];
    logger.loader("Config loaded successfully!");
} catch (e) {
    return logger.loader("Cannot load config.json! " + e, "error");
}

// --- INITIALIZE DATABASE ---
const { Sequelize, sequelize } = require("./includes/database")(global.config.DATABASE); // <-- THE FIX IS HERE

// --- LOGIN FUNCTION ---
function onBotLogin(models) {
    const appStateFile = resolve(join(global.client.mainPath, global.config.APPSTATEPATH || "appstate.json"));
    let loginOptions = {};

    if (existsSync(appStateFile)) {
        try {
            loginOptions.appState = JSON.parse(readFileSync(appStateFile, 'utf8'));
        } catch (e) {
            return logger.loader("Could not parse appstate.json. Please login again.", "error");
        }
    } else {
        loginOptions = { email: global.config.EMAIL, password: global.config.PASSWORD };
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

        writeFileSync(appStateFile, JSON.stringify(api.getAppState(), null, 4));
        api.setOptions(global.config.FCAOption);
        global.client.api = api;

        const commandPath = join(global.client.mainPath, 'Priyansh/commands');
        const commandFiles = readdirSync(commandPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            try {
                const command = require(join(commandPath, file));
                if (!command.config || !command.run) continue;
                global.client.commands.set(command.config.name, command);
            } catch (e) {
                logger.loader(`Cannot load command ${file}: ${e}`, "error");
            }
        }
        
        logger.loader(`Loaded ${global.client.commands.size} commands.`);
        logger.loader(`Bot is ready. Startup time: ${((Date.now() - global.client.timeStart) / 1000).toFixed()}s`);

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
        const models = require('./includes/database/model')({ Sequelize, sequelize });

        models.define('sets', {
            name: { type: Sequelize.STRING, primaryKey: true, allowNull: false },
            price: { type: Sequelize.FLOAT, allowNull: false },
            description: { type: Sequelize.TEXT, allowNull: true }
        });
        await sequelize.sync({ force: false });

        logger.loader("Database connected successfully.", '[ DATABASE ]');
        onBotLogin(models);

    } catch (error) {
        logger.loader(`Database connection failed: ${error}`, '[ DATABASE ]');
    }
})();
