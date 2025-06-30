module.exports = function(data) {
    const { api, models } = data;

    // This is the main function that gets called for every event
    return function(event) {
        if (!event) return; // Ignore null events

        // --- 1. HANDLE CONVERSATIONAL REPLIES ---
        // If the user is replying to a specific message from the bot (e.g., in the /buy flow)
        if (global.client.handleReply.length > 0 && event.type === "message_reply") {
            for (const reply of global.client.handleReply) {
                // Find the matching conversation by messageID and ensure it's the same author
                if (reply.messageID === event.messageReply.messageID && reply.author === event.senderID) {
                    const commandModule = global.client.commands.get(reply.name);
                    
                    // If the command has a handleReply function, execute it
                    if (commandModule && commandModule.handleReply) {
                        try {
                            commandModule.handleReply({ ...data, event, handleReply: reply });
                        } catch (e) {
                            console.error(`Error in handleReply for ${reply.name}:`, e);
                        }
                    }
                    // Stop processing so we don't treat it as a new command
                    return; 
                }
            }
        }

        // --- 2. HANDLE MENU REACTIONS ---
        // If the user reacts to a message (like the /start menu)
        if (global.client.handleReaction.length > 0 && event.type === "message_reaction") {
            for (const reaction of global.client.handleReaction) {
                 // Find the matching menu by messageID and ensure it's the same author
                if (reaction.messageID === event.messageID && reaction.author === event.userID) {
                    const commandModule = global.client.commands.get(reaction.name);
                    
                    // If the command has a handleReaction function, execute it
                    if (commandModule && commandModule.handleReaction) {
                        try {
                            commandModule.handleReaction({ ...data, event, handleReaction: reaction });
                        } catch (e) {
                            console.error(`Error in handleReaction for ${reaction.name}:`, e);
                        }
                    }
                    // Stop processing
                    return;
                }
            }
        }
        
        // --- 3. PROCESS NEW COMMANDS ---
        if (event.type !== "message" || !event.body) return;

        const { body, senderID, threadID, messageID } = event;
        const prefix = global.config.PREFIX;
        const botName = global.config.BOTNAME;

        // --- Prefix Hint Feature ---
        // If the message doesn't start with a prefix but mentions the bot's name, give a helpful hint.
        if (!body.startsWith(prefix) && body.toLowerCase().includes(botName.toLowerCase())) {
            return api.sendMessage(`My command prefix is "${prefix}".\n\nType "${prefix}help" to see what I can do!`, threadID, messageID);
        }

        // Ignore any message that doesn't start with the prefix
        if (!body.startsWith(prefix)) return;
        
        // Parse the command and its arguments
        const args = body.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        
        // Find the command by its name or alias
        const command = global.client.commands.get(commandName);

        // --- Command Not Found Feature ---
        if (!command) {
            return api.sendMessage(`❌ Command not found.\n\nPlease use "${prefix}help" to see the list of available commands.`, threadID, messageID);
        }

        // --- Permission Check ---
        const isAdmin = global.config.ADMINBOT.includes(senderID);
        if (command.config.hasPermssion === 2 && !isAdmin) {
            return api.sendMessage("You do not have permission to use this command.", threadID, messageID);
        }
        
        // --- Execute the Command ---
        try {
            // Pass all necessary data to the command's run function
            command.run({ api, event, args, models });
        } catch (e) {
            console.error(`Error executing command ${command.config.name}:`, e);
            api.sendMessage(`An error occurred while executing the '${command.config.name}' command. Please contact the admin.`, threadID, messageID);
        }
    };
};
