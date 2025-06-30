module.exports = function(data) {
    const { api, models } = data;

    return function(event) {
        if (!event) return;

        // --- 1. HANDLE CONVERSATIONAL REPLIES ---
        if (event.type === "message" && global.client.handleReply.length > 0) {
            for (const reply of global.client.handleReply) {
                if (reply.author === event.senderID && event.messageReply?.messageID === reply.messageID) {
                    const commandModule = global.client.commands.get(reply.name);
                    if (commandModule && commandModule.handleReply) {
                        // Remove the reply entry after processing
                        const index = global.client.handleReply.findIndex(item => item.messageID === reply.messageID);
                        if (index > -1) global.client.handleReply.splice(index, 1);
                        try {
                            // Timeout to clear stale reply after 5 minutes
                            setTimeout(() => {
                                global.client.handleReply = global.client.handleReply.filter(h => h.messageID !== reply.messageID);
                            }, 5 * 60 * 1000);
                            return commandModule.handleReply({ ...data, event, handleReply: reply });
                        } catch (e) {
                            console.error(`Error in handleReply for ${reply.name}:`, e);
                            api.sendMessage("An error occurred while processing your reply. Please try again or contact the admin.", event.threadID, event.messageID);
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
                            api.sendMessage("An error occurred while processing your reaction. Please try again or contact the admin.", event.threadID);
                        }
                    }
                    return;
                }
            }
        }
        
        if (event.type !== "message" || !event.body) return;

        const { body, senderID, threadID, messageID, isGroup } = event;
        const prefix = global.config.PREFIX;

        // --- 3. AUTO-REPLY FOR NON-PREFIXED MESSAGES ---
        if (!body.startsWith(prefix) && senderID !== api.getCurrentUserID()) {
            const autoReplyMessage = `Welcome to ${global.config.BOTNAME}! Please use the prefix "${prefix}" for commands (e.g., ${prefix}help).`;
            return api.sendMessage(autoReplyMessage, threadID, messageID);
        }

        // --- 4. PROCESS COMMANDS ---
        if (!body.startsWith(prefix)) return;
        
        const args = body.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        
        const command = global.client.commands.get(commandName);
        if (!command) {
            return api.sendMessage(`❌ Command "${commandName}" not found.\n\nPlease use "${prefix}help" to see the list of available commands.`, threadID, messageID);
        }

        const isAdmin = global.config.ADMINBOT.includes(senderID);
        if (command.config.hasPermssion === 2 && !isAdmin) {
            return api.sendMessage("You do not have permission to use this command.", threadID, messageID);
        }
        
        try {
            // Apply cooldown
            const key = `${senderID}_${command.config.name}`;
            const cooldown = command.config.cooldowns || 5;
            const now = Date.now();
            const lastUsed = global.client.cooldowns.get(key) || 0;
            if (now - lastUsed < cooldown * 1000) {
                return api.sendMessage(`Please wait ${cooldown} seconds before using ${command.config.name} again!`, threadID, messageID);
            }
            global.client.cooldowns.set(key, now);

            // Run command
            command.run({ api, event, args, models });
        } catch (e) {
            console.error(`Error executing command ${command.config.name}:`, e);
            api.sendMessage(`An error occurred while executing the '${command.config.name}' command. Please contact the admin.`, threadID, messageID);
        }
    };
};
