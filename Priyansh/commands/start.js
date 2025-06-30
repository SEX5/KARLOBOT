module.exports.config = {
    name: "start",
    version: "1.0.0",
    hasPermssion: 0,
    commandCategory: "system",
    cooldowns: 5,
    aliases: ["menu"]
};

module.exports.handleReaction = async function({ api, event, handleReaction }) {
    if (event.userID != handleReaction.author) return;
    
    const buyCommand = global.client.commands.get("buy");
    const viewSetsCommand = global.client.commands.get("viewsets");

    switch (event.reaction) {
        case "👍":
            api.unsendMessage(handleReaction.messageID);
            buyCommand.run({ api, event, args: [] });
            break;
        case "❤️":
            api.unsendMessage(handleReaction.messageID);
            viewSetsCommand.run({ api, event, args: [] });
            break;
    }
};

module.exports.run = async function({ api, event }) {
    const message = "👋 Welcome to the CarX Account Shop!\n\n" +
                    "Please react to this message to continue:\n\n" +
                    "👍 - Buy an Account\n" +
                    "❤️ - View Available Sets";
    
    api.sendMessage(message, event.threadID, (err, info) => {
        if (err) return console.error(err);
        global.client.handleReaction.push({
            name: this.config.name,
            messageID: info.messageID,
            author: event.senderID
        });
    }, event.messageID);
};