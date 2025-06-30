module.exports.config = { name: "buy", commandCategory: "shop", hasPermssion: 0, cooldowns: 10 };

module.exports.handleReply = async function({ api, event, handleReply, models }) {
    if (event.senderID !== handleReply.author) return;

    const Set = models.sets;
    const userReply = event.body;
    let { step, orderData } = handleReply;
    api.unsendMessage(handleReply.messageID);

    switch (step) {
        case "GET_EMAIL":
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userReply)) {
                return api.sendMessage("That doesn't look like a valid email. Please try again.", event.threadID);
            }
            orderData.email = userReply;
            api.sendMessage("Great! Now, what password would you like for the account?", event.threadID, (err, info) => {
                global.client.handleReply.push({ name: this.config.name, messageID: info.messageID, author: event.senderID, step: "GET_PASSWORD", orderData });
            });
            break;

        case "GET_PASSWORD":
            orderData.password = userReply;
            const allSets = await Set.findAll();
            if (allSets.length === 0) return api.sendMessage("Sorry, there are no sets available right now.", event.threadID);

            let setList = "Please choose a set by replying with its number:\n\n";
            allSets.forEach((set, index) => {
                setList += `${index + 1}. **${set.name}** - $${set.price}\n`;
            });
            
            orderData.availableSets = allSets.map(s => s.get({ plain: true }));
            api.sendMessage(setList, event.threadID, (err, info) => {
                global.client.handleReply.push({ name: this.config.name, messageID: info.messageID, author: event.senderID, step: "CHOOSE_SET", orderData });
            });
            break;

        case "CHOOSE_SET":
            const choice = parseInt(userReply, 10) - 1;
            if (isNaN(choice) || !orderData.availableSets[choice]) {
                return api.sendMessage("Invalid choice. Please reply with a valid number from the list.", event.threadID);
            }
            orderData.chosenSet = orderData.availableSets[choice];
            const paymentDetails = `You have chosen: **${orderData.chosenSet.name}**\n\n` +
                                   `Please send **$${orderData.chosenSet.price}** to:\n` +
                                   `• PhonePe/GPay: YOUR_UPI_ID_HERE\n` +
                                   `• Name: YOUR_NAME_HERE\n\n` +
                                   `After paying, please reply with a screenshot of the receipt.`;
            api.sendMessage(paymentDetails, event.threadID, (err, info) => {
                global.client.handleReply.push({ name: this.config.name, messageID: info.messageID, author: event.senderID, step: "PAYMENT_PROOF", orderData });
            });
            break;

        case "PAYMENT_PROOF":
            if (!event.attachments || event.attachments.length === 0 || event.attachments[0].type !== "photo") {
                return api.sendMessage("Please reply with a photo/screenshot of your payment.", event.threadID);
            }
            
            const adminID = global.config.ADMINBOT[0];
            const orderMessage = `🎉 **New Order Received!** 🎉\n\n` +
                                 `**From User:** ${event.senderID}\n` +
                                 `**Email:** ${orderData.email}\n` +
                                 `**Password:** ${orderData.password}\n` +
                                 `**Set:** ${orderData.chosenSet.name} ($${orderData.chosenSet.price})\n\n` +
                                 `Payment proof is attached.`;
            
            await api.sendMessage({
                body: orderMessage,
                attachment: await global.utils.getStreamFromURL(event.attachments[0].url)
            }, adminID);

            api.sendMessage("✅ Your order has been submitted! The admin will verify and contact you shortly with your account details. Thank you!", event.threadID);
            break;
    }
};

module.exports.run = async function({ api, event }) {
    api.sendMessage("Let's start your order. First, please enter the email address for your new account.", event.threadID, (err, info) => {
        global.client.handleReply.push({
            name: this.config.name,
            messageID: info.messageID,
            author: event.senderID,
            step: "GET_EMAIL",
            orderData: {}
        });
    }, event.messageID);
};
