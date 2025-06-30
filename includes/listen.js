// --- includes/listen.js (FINAL VERSION with Auto-Reply for Private Chat) ---

module.exports = function(data) {
    const { api, models } = data;

    return function(event) {
        if (!event) return;

        // --- 1. HANDLE CONVERSATIONAL REPLIES ---
        if ((event.type === "message_reply" || event.type === "message") && global.client.handleReply.length > 0) {
            for (const reply of global.client.handleReply) {
                if (reply.author === event.senderID && (reply.messageID === event.messageReply?.messageID || reply.threadID === event.threadID)) {
                    const commandModule = global.client.commands.get(reply.name);
                    if (commandModule && commandModule.handleReply) {
                        const index = global.client.handleReply.findIndex(item => item.author === reply.author);
                        if (index > -1) global.client.handleReply.splice(index, 1);
                        try {
                            return commandModule.handleReply({ ...data, event, handleReply: reply });
                        } catch (e) { console.error(`Error in handleReply for ${reply.name}:`, e); }
                    }
                    return;
                }
            }
        }

        // --- 2. HANDLE MENU REACTIONS ---
        if (event.type === "message_reaction" && global.client.handleReaction.length > 0) {
            for (const reaction of global.client.handleReaction) {
                if (reaction.messageID === event.messageID && reaction.author === event.userID) {
                    const commandModule = global.client.commands.get(reaction.name);
                    if (commandModule && commandModule.handleReaction) {
                        try {
                            return commandModule.handleReaction({ ...data, event, handleReaction: reaction });
                        } catch (e) { console.error(`Error in handleReaction for ${reaction.name}:`, e); }
                    }
                    return;
                }
            }
        }
        
        if (event.type !== "message" || !event.body) return;

        const { body, senderID, threadID, messageID, isGroup } = event;
        const prefix = global.config.PREFIX;

        // --- NEW: AUTO-REPLY FOR PRIVATE MESSAGES ---
        // Check if it's a private message, not from the bot itself, and not a command.
        if (!isGroup && senderID !== api.getCurrentUserID() && !body.startsWith(prefix)) {
            // You can customize this message
            const autoReplyMessage = "👋 Hello! Thanks for your message.\n\n" +
                                     "I am the CarX Shop Bot. To see what I can do, please type " +
                                     `"${prefix}start" or "${prefix}help".`;
            
            return api.sendMessage(autoReplyMessage, threadID);
        }

        // --- 3. PROCESS COMMANDS ---
        if (!body.startsWith(prefix)) return;
        
        const args = body.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        
        const command = global.client.commands.get(commandName);

        if (!command) {
            return api.sendMessage(`❌ Command not found.\n\nPlease use "${prefix}help" to see the list of available commands.`, threadID, messageID);
        }

        const isAdmin = global.config.ADMINBOT.includes(senderID);
        if (command.config.hasPermssion === 2 && !isAdmin) {
            return api.sendMessage("You do not have permission to use this command.", threadID, messageID);
        }
        
        try {
            command.run({ api, event, args, models });
        } catch (e) {
            console.error(`Error executing command ${command.config.name}:`, e);
            api.sendMessage(`An error occurred while executing the '${command.config.name}' command. Please contact the admin.`, threadID, messageID);
        }
    };
};
