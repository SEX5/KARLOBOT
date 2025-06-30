// --- includes/listen.js (FINAL VERSION - No Prefix, Private Chat Enabled) ---

module.exports = function(data) {
    const { api, models } = data;

    return function(event) {
        if (!event) return;

        // --- 1. HANDLE CONVERSATIONAL REPLIES & MESSAGES ---
        if ((event.type === "message" || event.type === "message_reply") && global.client.handleReply.length > 0) {
            for (const reply of global.client.handleReply) {
                // For a conversation, we only care that it's the right person in the right chat.
                if (reply.author === event.senderID && reply.threadID === event.threadID) {
                    const commandModule = global.client.commands.get(reply.name);
                    
                    if (commandModule && commandModule.handleReply) {
                        try {
                            // Find and remove this specific reply from the global queue
                            const  index = global.client.handleReply.findIndex(item => item.messageID === reply.messageID && item.author === reply.author);
                            if (index > -1) {
                                global.client.handleReply.splice(index, 1);
                            }
                            return commandModule.handleReply({ ...data, event, handleReply: reply });
                        } catch (e) {
                            console.error(`Error in handleReply for ${reply.name}:`, e);
                        }
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
                        } catch (e) {
                            console.error(`Error in handleReaction for ${reaction.name}:`, e);
                        }
                    }
                    return;
                }
            }
        }

        // --- 3. PROCESS NEW COMMANDS (ONLY IF A PREFIX IS USED) ---
        if (event.type !== "message" || !event.body) return;

        const { body, senderID, threadID, messageID } = event;
        const prefix = global.config.PREFIX;

        // Only check for commands if the message starts with a prefix
        if (!body.startsWith(prefix)) return;
        
        const args = body.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        
        const command = global.client.commands.get(commandName);

        if (!command) {
            // If it started with a prefix but wasn't a valid command, inform the user.
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
