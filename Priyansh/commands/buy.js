module.exports.config = {
    name: "buy",
    commandCategory: "shop",
    hasPermssion: 0,
    cooldowns: 10,
    description: "Starts the process to buy a CarX account."
};

/**
 * This function handles the multi-step conversation after the /buy command is initiated.
 * It uses the 'step' property within the handleReply object to track progress.
 */
module.exports.handleReply = async function({ api, event, handleReply, models }) {
    // Ensure the reply is from the original user who started the command
    if (event.senderID !== handleReply.author) return;

    // Unsend the bot's previous message to keep the chat clean
    api.unsendMessage(handleReply.messageID);

    const Set = models.sets; // Correctly access the 'sets' model
    const userReply = event.body;
    let { step, orderData } = handleReply; // Get current step and the data we've collected so far

    switch (step) {
        // STEP 1: User has replied with their email
        case "GET_EMAIL":
            // Basic email validation using a regular expression
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userReply)) {
                return api.sendMessage("That doesn't look like a valid email. Please try again.", event.threadID, event.messageID);
            }
            orderData.email = userReply; // Save the email
            
            // Ask for the next piece of information
            api.sendMessage("Great! Now, what password would you like for the account?", event.threadID, (err, info) => {
                // Register a new handleReply for the next step
                global.client.handleReply.push({ name: this.config.name, messageID: info.messageID, author: event.senderID, step: "GET_PASSWORD", orderData });
            });
            break;

        // STEP 2: User has replied with their desired password
        case "GET_PASSWORD":
            orderData.password = userReply; // Save the password
            
            // Fetch all available sets from the database
            const allSets = await Set.findAll();
            if (allSets.length === 0) {
                api.sendMessage("Sorry, there are no sets available for purchase right now.", event.threadID, event.messageID);
                return; // End conversation
            }

            // Create a numbered list of sets for the user to choose from
            let setList = "Please choose a set by replying with its number:\n\n";
            allSets.forEach((set, index) => {
                setList += `${index + 1}. **${set.name}** - $${set.price}\n`;
            });
            
            // Store the list of sets in the conversation data so we can validate the user's choice
            orderData.availableSets = allSets.map(s => s.get({ plain: true }));
            
            // Ask the user to choose a set
            api.sendMessage(setList, event.threadID, (err, info) => {
                global.client.handleReply.push({ name: this.config.name, messageID: info.messageID, author: event.senderID, step: "CHOOSE_SET", orderData });
            });
            break;

        // STEP 3: User has replied with their set choice
        case "CHOOSE_SET":
            const choice = parseInt(userReply, 10) - 1; // Convert reply to a zero-based index

            // Validate the choice
            if (isNaN(choice) || !orderData.availableSets[choice]) {
                return api.sendMessage("Invalid choice. Please reply with a valid number from the list.", event.threadID, event.messageID);
            }

            orderData.chosenSet = orderData.availableSets[choice]; // Save the chosen set object
            
            // Construct the payment instructions using info from config.json
            const paymentDetails = `You have chosen: **${orderData.chosenSet.name}**\n\n` +
                                   `Please send **$${orderData.chosenSet.price}** to:\n${global.config.PAYMENT_INFO}\n\n` +
                                   `After paying, please reply with a screenshot of the receipt.`;

            // Ask for payment proof
            api.sendMessage(paymentDetails, event.threadID, (err, info) => {
                global.client.handleReply.push({ name: this.config.name, messageID: info.messageID, author: event.senderID, step: "PAYMENT_PROOF", orderData });
            });
            break;

        // STEP 4: User has replied with the payment proof
        case "PAYMENT_PROOF":
            // Check if the reply is actually a photo
            if (!event.attachments || event.attachments.length === 0 || event.attachments[0].type !== "photo") {
                return api.sendMessage("That was not a photo. Please reply with a screenshot of your payment.", event.threadID, event.messageID);
            }
            
            try {
                const adminID = global.config.ADMINBOT[0]; // Get admin ID from config
                const orderMessage = `🎉 **New Order Received!** 🎉\n\n` +
                                     `**From User:** ${event.senderID}\n` +
                                     `**Email:** ${orderData.email}\n` +
                                     `**Password:** ${orderData.password}\n` +
                                     `**Set:** ${orderData.chosenSet.name} ($${orderData.chosenSet.price})\n\n` +
                                     `Payment proof is attached.`;
                
                // Forward the complete order details and the image to the admin
                await api.sendMessage({
                    body: orderMessage,
                    attachment: await global.utils.getStreamFromURL(event.attachments[0].url) // Use the utility to get a readable stream
                }, adminID);

                // Confirm with the user that their order is submitted
                api.sendMessage("✅ Your order has been submitted! The admin will verify and contact you shortly. Thank you!", event.threadID, event.messageID);
            } catch (e) {
                console.error("Failed to forward order to admin:", e);
                api.sendMessage("Sorry, there was an error submitting your order. Please contact the admin directly.", event.threadID, event.messageID);
            }
            // End of conversation
            break;
    }
};

/**
 * This is the entry point for the /buy command.
 * It starts the conversation by asking for the user's email.
 */
module.exports.run = async function({ api, event }) {
    api.sendMessage("Let's start your order. First, please enter the email address for your new account.", event.threadID, (err, info) => {
        // Register the first handleReply to start the conversation
        global.client.handleReply.push({
            name: this.config.name,
            messageID: info.messageID,
            author: event.senderID,
            step: "GET_EMAIL",
            orderData: {} // Initialize an empty object to store the order details
        });
    }, event.messageID);
};
