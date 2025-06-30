module.exports.config = { name: "help", commandCategory: "system", hasPermssion: 0, cooldowns: 5 };

module.exports.run = async function({ api, event }) {
    const helpMessage = "🤖 **Bot Instructions** 🤖\n\n" +
                        "» Use `/start` to see the main menu.\n\n" +
                        "**To Buy an Account:**\n" +
                        "1. Choose 'Buy Account' from the menu.\n" +
                        "2. Follow the prompts for email and password.\n" +
                        "3. Select a set by replying with its number.\n" +
                        "4. Send a screenshot of your payment.\n" +
                        "5. Your unique ID is your Facebook User ID: " + event.senderID + "\n\n" +
                        "» Use `/cancel` at any time to stop the current process.";
    return api.sendMessage(helpMessage, event.threadID, event.messageID);
};