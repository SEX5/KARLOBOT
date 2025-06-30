// --- includes/database/index.js (UPDATED) ---
const { Sequelize } = require('sequelize');

// Export a function that initializes Sequelize
module.exports = (config) => {
    if (!config || !config.sqlite) {
        throw new Error("Database configuration is missing or invalid in config.json");
    }

    const sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: config.sqlite.storage,
        logging: false // Set to true to see SQL queries in console
    });

    return { Sequelize, sequelize };
};
