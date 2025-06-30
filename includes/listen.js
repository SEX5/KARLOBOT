// --- includes/listen.js (FINAL, RE-ORDERED VERSION) ---

module.exports = function(data) {
    const { api, models } = data;

    return function(event) {
        if (!event) return;

        // --- 1. PRIORITY: HANDLE CONVERSATIONAL REPLIES ---
        // This block now runs FIRST.
        if (event.type === "message_reply" && global.client.handleReply.length > 0) {
            for (const reply of global.client.handleReply) {
                // Check if the user is replying to a message the bot is waiting on.
                if (reply.messageID === event.messageReply.messageID) {
                    // Make sure the person replying is the person who started the conversation.
                    if (reply.author !== event.senderID) return;

                    const commandModule = global.client.commands.get(reply.name);
                    if (commandModule && commandModule.handleReply) {
                        try {
                            return commandModule.handleReply({ ...data, event, handleReply: reply });
                        } catch (e) {
                            console.error(`Error in handleReply for ${reply.name}:`, e);
                        }
                    }
                    return; // Important: Stop further processing once a reply is handled.
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
        
        // --- 3. PROCESS NEW COMMANDS ---
        if (event.type !== "message" || !event.body) return;

        const { body, senderID, threadID, messageID } = event;
        const prefix = global.config.PREFIX;
        
        // If the message doesn't start with the prefix, ignore it.
        // The prefix hint logic is removed for simplicity to solve the main issue.
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
