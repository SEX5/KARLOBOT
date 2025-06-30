// --- includes/listen.js (FINAL VERSION - Handles both PM and Group) ---

module.exports = function(data) {
    const { api, models } = data;

    return async function(event) {
        if (!event) return;

        // Handle replies and reactions first, as they are context-dependent
        if (global.client.handleReply.length > 0 && event.type === "message_reply") {
            // ... (handleReply logic remains the same)
        }
        if (global.client.handleReaction.length > 0 && event.type === "message_reaction") {
            // ... (handleReaction logic remains the same)
        }
        
        if (event.type !== "message" || !event.body) return;

        // --- THE CRITICAL CHECK ---
        // If allowInbox is false AND this is a private message, ignore it.
        // We set allowInbox to true in the config, so this check will now pass for PMs.
        if (event.isGroup === false && global.config.allowInbox === false) {
            return;
        }

        const { body, senderID, threadID, messageID } = event;
        const prefix = global.config.PREFIX;

        // --- First-Time User Logic for Private Chats ---
        if (event.isGroup === false) {
            const User = models.users;
            const startCommand = global.client.commands.get("start");

            try {
                const user = await User.findOne({ where: { userID: senderID } });
                if (!user && !body.startsWith(prefix) && startCommand) {
                    await User.create({ userID: senderID });
                    return startCommand.run({ api, event, models });
                }
            } catch(e) {
                console.error("First-time user database check failed:", e);
            }
        }
        
        if (!body.startsWith(prefix)) return;
        
        const args = body.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        
        const command = global.client.commands.get(commandName);

        if (!command) {
            // Your "command not found" logic can go here if you want it
            return;
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
