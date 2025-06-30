module.exports.config = { name: "cancel", commandCategory: "system", hasPermssion: 0, cooldowns: 0 };
module.exports.run = async function({ api, event }) {
    return api.sendMessage("✅ Your current action has been canceled.", event.threadID, event.messageID);
};