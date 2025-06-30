module.exports.config = { name: "editset", commandCategory: "admin", hasPermssion: 2, cooldowns: 5 };

module.exports.handleReply = async function({ api, event, handleReply, models }) {
    const { author, step } = handleReply;
    if (event.senderID !== author) return;
    api.unsendMessage(handleReply.messageID);
    
    const Set = models.sets;
    let { setData } = handleReply;
    const userInput = event.body;

    switch (step) {
        case 1: // Get set name
            const setToEdit = await Set.findOne({ where: { name: userInput } });
            if (!setToEdit) return api.sendMessage(`Set '${userInput}' not found.`, event.threadID);
            handleReply.setData = setToEdit.get({ plain: true });
            api.sendMessage(`Editing '${userInput}'.\nNew price? (Current: $${setToEdit.price}, type 'skip' to keep)`, event.threadID, (err, info) => {
                global.client.handleReply.push({ name: this.config.name, messageID: info.messageID, author, step: 2, ...handleReply });
            });
            break;
        case 2: // Get new price
            if (userInput.toLowerCase() !== 'skip') {
                const newPrice = parseFloat(userInput);
                if (isNaN(newPrice) || newPrice <= 0) return api.sendMessage("Invalid price. Please enter a positive number.", event.threadID);
                setData.price = newPrice;
            }
            api.sendMessage(`New description? (type 'skip' to keep, 'clear' to remove)`, event.threadID, (err, info) => {
                global.client.handleReply.push({ name: this.config.name, messageID: info.messageID, author, step: 3, setData });
            });
            break;
        case 3: // Get new description and update
            if (userInput.toLowerCase() !== 'skip') {
                setData.description = userInput.toLowerCase() === 'clear' ? null : userInput;
            }
            await Set.update({ price: setData.price, description: setData.description }, { where: { name: setData.name } });
            api.sendMessage(`✅ Set '${setData.name}' has been updated.`, event.threadID);
            break;
    }
};

module.exports.run = async function({ api, event, models }) {
    const Set = models.get('sets');
    const allSets = await Set.findAll();
    if (allSets.length === 0) return api.sendMessage("There are no sets to edit.", event.threadID);

    let message = "Which set would you like to edit? Reply with the exact name:\n\n";
    allSets.forEach(set => { message += `• ${set.name}\n`; });

    api.sendMessage(message, event.threadID, (err, info) => {
        global.client.handleReply.push({ name: this.config.name, messageID: info.messageID, author: event.senderID, step: 1 });
    });
};
