const { EmbedBuilder } = require('discord.js');
const { ServerConfig } = require('../database/mongodb');

class Logger {
    static async logTicketAction(client, guildId, embed) {
        try {
            const config = await ServerConfig.findOne({ guildId });
            if (!config || !config.logChannelId) return;

            const channel = client.channels.cache.get(config.logChannelId);
            if (channel) {
                await channel.send({ embeds: [embed] }).catch(() => {});
            }
        } catch (error) {
            console.error('Logging error:', error);
        }
    }

    static async logError(client, error) {
        try {
            const errorMsg = error.stack || error.message || String(error);
            console.error('Bot Error:', errorMsg.substring(0, 500));
            
            // Send to owner if possible
            const owner = await client.users.fetch(process.env.OWNER_ID).catch(() => null);
            if (owner) {
                const errEmbed = new EmbedBuilder()
                    .setTitle('⚠️ Bot Error')
                    .setDescription('```js\n' + errorMsg.substring(0, 2000) + '\n```')
                    .setColor('#FF0000')
                    .setTimestamp();
                await owner.send({ embeds: [errEmbed] }).catch(() => {});
            }
        } catch (e) {
            console.error('Error logging failed:', e);
        }
    }
}

module.exports = Logger;
