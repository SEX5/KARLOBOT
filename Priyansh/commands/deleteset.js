module.exports.config = { name: "deleteset", commandCategory: "admin", hasPermssion: 2, cooldowns: 5 };

module.exports.handleReply = async function({ api, event, handleReply, models }) {
    if (event.senderID !== handleReply.author) return;
    api.unsendMessage(handleReply.messageID);
    const Set = models.get('sets');
    const setName = event.body;

    const result = await Set.destroy({ where: { name: setName } });

    if (result > 0) {
        return api.sendMessage(`✅ Set '${setName}' has been successfully deleted.`, event.threadID);
    } else {
        return api.sendMessage(`❌ Set '${setName}' not found.`, event.threadID);
    }
};

module.exports.run = async function({ api, event, models }) {
    const Set = models.get('sets');
    const allSets = await Set.findAll();
    if (allSets.length === 0) return api.sendMessage("There are no sets to delete.", event.threadID);

    let message = "Which set would you like to delete? Reply with the exact name:\n\n";
    allSets.forEach(set => { message += `• ${set.name}\n`; });

    api.sendMessage(message, event.threadID, (err, info) => {
        global.client.handleReply.push({ name: this.config.name, messageID: info.messageID, author: event.senderID });
    });
};