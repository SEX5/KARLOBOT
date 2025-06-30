// --- includes/listen.js (BUILT FOR FCA-UNOFFICIAL) ---

module.exports = function(data) {
    const { api, models } = data;

    return async function(event) {
        if (!event) return;

        // --- Standardize event object for consistency ---
        // fca-unofficial uses different property names
        if (event.type === "message_reply") {
            event.threadID = event.threadID || event.messageReply.threadID;
            event.messageID = event.messageID || event.messageReply.messageID;
            event.senderID = event.senderID || event.messageReply.senderID;
        }

        // Handle replies for conversational commands
        if (event.type === "message_reply" && global.client.handleReply.length > 0) {
            const reply = global.client.handleReply.find(item => item.messageID === event.messageReply.messageID);
            if (reply && reply.author === event.senderID) {
                const commandModule = global.client.commands.get(reply.name);
                if (commandModule && commandModule.handleReply) {
                    try {
                        global.client.handleReply = global.client.handleReply.filter(item => item.messageID !== event.messageReply.messageID);
                        return await commandModule.handleReply({ ...data, event, handleReply: reply });
                    } catch (e) {
                        return console.error(`Error in handleReply for ${reply.name}:`, e);
                    }
                }
            }
        }

        // Handle reactions (untested with fca-unofficial, but should be similar)
        if (event.type === "message_reaction" && global.client.handleReaction.length > 0) {
            // ... (reaction logic can be added here if needed, but we rely on replies more)
        }

        if (event.type !== "message" || !event.body) return;
        
        const { body, senderID, threadID, messageID, isGroup } = event;
        
        // This is now redundant as we check for commands, but good for clarity.
        if (isGroup === true && global.config.allowInbox === false) {
             return; // Or handle group messages differently if you want
        }

        const prefix = global.config.PREFIX;

        // First-time user check for private messages
        if (isGroup === false) {
            const User = models.users;
            const startCommand = global.client.commands.get("start");
            try {
                const user = await User.findOne({ where: { userID: senderID } });
                if (!user && !body.startsWith(prefix) && startCommand) {
                    await User.create({ userID: senderID });
                    return startCommand.run({ api, event, models });
                }
            } catch(e) { console.error("First-time user check failed:", e); }
        }

        if (!body.startsWith(prefix)) return;
        
        const args = body.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        const command = global.client.commands.get(commandName);

        if (!command) return;

        const isAdmin = global.config.ADMINBOT.includes(senderID.toString());
        if (command.config.hasPermssion === 2 && !isAdmin) {
            return api.sendMessage("Only bot administrators can use this command.", threadID, messageID);
        }
        
        try {
            await command.run({ api, event, args, models });
        } catch (e) {
            console.error(`Error executing command ${command.config.name}:`, e);
            api.sendMessage(`An error occurred: ${e.message}`, threadID, messageID);
        }
    };
};
