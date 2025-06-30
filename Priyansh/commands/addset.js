module.exports.config = { name: "addset", commandCategory: "admin", hasPermssion: 2, cooldowns: 5 };

module.exports.handleReply = async function({ api, event, handleReply, models }) {
    const { author, step } = handleReply;
    if (event.senderID !== author) return;
    api.unsendMessage(handleReply.messageID);

    const Set = models.get('sets');

    switch (step) {
        case 1: // Get Name
            handleReply.name = event.body;
            api.sendMessage("What is the price for this set?", event.threadID, (err, info) => {
                global.client.handleReply.push({ name: this.config.name, messageID: info.messageID, author, step: 2, ...handleReply });
            });
            break;
        case 2: // Get Price
            const price = parseFloat(event.body);
            if (isNaN(price) || price <= 0) return api.sendMessage("Invalid price. Please enter a positive number.", event.threadID);
            handleReply.price = price;
            api.sendMessage("Enter a description (or type 'skip').", event.threadID, (err, info) => {
                global.client.handleReply.push({ name: this.config.name, messageID: info.messageID, author, step: 3, ...handleReply });
            });
            break;
        case 3: // Get Description and Save
            handleReply.description = event.body.toLowerCase() === 'skip' ? null : event.body;
            try {
                await Set.create({ name: handleReply.name, price: handleReply.price, description: handleReply.description });
                api.sendMessage(`✅ Set '${handleReply.name}' added successfully.`, event.threadID);
            } catch (e) {
                if (e.name === 'SequelizeUniqueConstraintError') {
                    api.sendMessage(`Error: A set with the name '${handleReply.name}' already exists.`, event.threadID);
                } else {
                    console.error(e);
                    api.sendMessage("An error occurred while adding the set.", event.threadID);
                }
            }
            break;
    }
};

module.exports.run = async function({ api, event }) {
    api.sendMessage("Enter the name of the new set:", event.threadID, (err, info) => {
        global.client.handleReply.push({ name: this.config.name, messageID: info.messageID, author: event.senderID, step: 1 });
    });
};