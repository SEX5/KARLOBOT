module.exports.config = { name: "viewsets", commandCategory: "shop", hasPermssion: 0, cooldowns: 5 };
module.exports.run = async function({ api, event, models }) {
    try {
        const Set = models.get('sets');
        if (!Set) return api.sendMessage("Database model for sets is not defined.", event.threadID);
        const allSets = await Set.findAll();
        if (allSets.length === 0) return api.sendMessage("Sorry, there are no sets available right now.", event.threadID);

        let message = "📦 **Available Account Sets** 📦\n\n";
        allSets.forEach(set => {
            message += `• **Name:** ${set.name}\n` +
                       `  **Price:** $${set.price}\n` +
                       `  **Description:** ${set.description || 'N/A'}\n\n`;
        });
        return api.sendMessage(message, event.threadID, event.messageID);
    } catch (e) {
        console.error("Error fetching sets:", e);
        return api.sendMessage("An error occurred while fetching the sets.", event.threadID);
    }
};