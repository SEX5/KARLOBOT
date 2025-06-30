// --- includes/listen.js (FINAL VERSION with First-Time User Detection) ---

module.exports = function(data) {
    const { api, models } = data;

    return async function(event) { // Make the function async to use await
        if (!event) return;

        // Existing handleReply and handleReaction logic... (no changes here)
        if (global.client.handleReply.length > 0 && event.type === "message_reply") {
            for (const reply of global.client.handleReply) {
                if (reply.messageID === event.messageReply.messageID) {
                    const module = global.client.commands.get(reply.name);
                    if (module && module.handleReply) {
                        try { return module.handleReply({ ...data, event, handleReply: reply }); } 
                        catch (e) { return console.error(`Error in handleReply for ${reply.name}:`, e); }
                    }
                }
            }
        }
        if (global.client.handleReaction.length > 0 && event.type === "message_reaction") {
            for (const reaction of global.client.handleReaction) {
                if (reaction.messageID === event.messageID) {
                    const module = global.client.commands.get(reaction.name);
                    if (module && module.handleReaction) {
                        try { return module.handleReaction({ ...data, event, handleReaction: reaction }); } 
                        catch (e) { return console.error(`Error in handleReaction for ${reaction.name}:`, e); }
                    }
                }
            }
        }
        
        if (event.type !== "message" || !event.body) return;

        const { body, senderID, threadID, messageID } = event;
        const prefix = global.config.PREFIX;

        // --- NEW: First-Time User Logic ---
        const User = models.users;
        const startCommand = global.client.commands.get("start");

        try {
            const user = await User.findOne({ where: { userID: senderID } });

            // If the user is NOT in the database and the message is NOT a command
            if (!user && !body.startsWith(prefix) && startCommand) {
                // Add the user to the database so we don't spam them again
                await User.create({ userID: senderID });
                // Automatically run the `/start` command for them
                return startCommand.run({ api, event, models });
            }
        } catch(e) {
            console.error("First-time user database check failed:", e);
        }
        // --- End of New Logic ---

        // If the message doesn't start with the prefix, ignore it.
        if (!body.startsWith(prefix)) return;
        
        const args = body.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        
        const command = global.client.commands.get(commandName);

        if (!command) {
            return api.sendMessage(`Command not found. Please use "${prefix}help" to see available commands.`, threadID, messageID);
        }

        const isAdmin = global.config.ADMINBOT.includes(senderID);
        if (command.config.hasPermssion === 2 && !isAdmin) {
            return api.sendMessage("Only bot administrators can use this command.", threadID, messageID);
        }
        
        try {
            command.run({ api, event, args, models });
        } catch (e) {
            console.error(`Error executing command ${command.config.name}:`, e);
            api.sendMessage(`An error occurred while executing the command: ${e.message}`, threadID, messageID);
        }
    };
};
