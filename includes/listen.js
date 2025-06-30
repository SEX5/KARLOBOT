// --- includes/listen.js (DEFINITIVE FINAL VERSION) ---

module.exports = function(data) {
    const { api, models } = data;

    return async function(event) {
        if (!event) return;

        // --- PRIORITY #1: Check for a reply to a specific message ---
        if (event.type === "message_reply" && global.client.handleReply.length > 0) {
            const reply = global.client.handleReply.find(item => item.messageID === event.messageReply.messageID);
            if (reply && reply.author === event.senderID) {
                const commandModule = global.client.commands.get(reply.name);
                if (commandModule && commandModule.handleReply) {
                    try {
                        // Remove the handleReply from the queue before executing
                        global.client.handleReply = global.client.handleReply.filter(item => item.messageID !== event.messageReply.messageID);
                        return await commandModule.handleReply({ ...data, event, handleReply: reply });
                    } catch (e) {
                        return console.error(`Error in handleReply for ${reply.name}:`, e);
                    }
                }
            }
        }

        // --- PRIORITY #2: Check for a reaction to a specific message ---
        if (event.type === "message_reaction" && global.client.handleReaction.length > 0) {
            const reaction = global.client.handleReaction.find(item => item.messageID === event.messageID);
            if (reaction && reaction.author === event.userID) {
                const commandModule = global.client.commands.get(reaction.name);
                if (commandModule && commandModule.handleReaction) {
                    try {
                        // Remove the handleReaction from the queue
                        global.client.handleReaction = global.client.handleReaction.filter(item => item.messageID !== event.messageID);
                        return await commandModule.handleReaction({ ...data, event, handleReaction: reaction });
                    } catch (e) {
                        return console.error(`Error in handleReaction for ${reaction.name}:`, e);
                    }
                }
            }
        }
        
        // --- PRIORITY #3: Handle new command messages ---
        if (event.type !== "message" || !event.body) return;

        const { body, senderID, threadID, messageID } = event;
        const prefix = global.config.PREFIX;

        if (!body.startsWith(prefix)) return;
        
        const args = body.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        
        const command = global.client.commands.get(commandName);

        if (!command) {
            return api.sendMessage(`Command not found. Please use "${prefix}help" to see available commands.`, threadID, messageID);
        }

        // --- Admin Check (Fixed) ---
        const isAdmin = global.config.ADMINBOT.includes(senderID.toString());
        if (command.config.hasPermssion === 2 && !isAdmin) {
            return api.sendMessage("Only bot administrators can use this command.", threadID, messageID);
        }
        
        try {
            await command.run({ api, event, args, models });
        } catch (e) {
            console.error(`Error executing command ${command.config.name}:`, e);
            api.sendMessage(`An error occurred while executing the command: ${e.message}`, threadID, messageID);
        }
    };
};
