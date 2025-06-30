module.exports.config = { name: "listsets", commandCategory: "admin", hasPermssion: 2, cooldowns: 5 };
module.exports.run = async function({ api, event, models }) {
    // This uses the same logic as viewsets.js, but is admin-only.
    const viewsetsCommand = global.client.commands.get("viewsets");
    return viewsetsCommand.run({ api, event, models });
};