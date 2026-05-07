const { Events, EmbedBuilder } = require('discord.js');
const { Ticket } = require('../database/mongodb');
const Logger = require('../utils/logger');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member, client) {
        try {
            const openTickets = await Ticket.find({ guildId: member.guild.id, creatorId: member.id, status: 'open' });

            for (const ticket of openTickets) {
                const channel = member.guild.channels.cache.get(ticket.channelId);
                if (!channel) continue;

                ticket.status = 'closed';
                ticket.closedAt = new Date();
                ticket.closedBy = client.user.id;
                ticket.closeReason = 'User left server';
                await ticket.save();

                const closeEmbed = new EmbedBuilder()
                    .setTitle('🔒 Auto-Closed')
                    .setDescription(`Ticket closed because ${member.user.tag} left the server.`)
                    .setColor('#FF0000').setTimestamp();

                await channel.send({ embeds: [closeEmbed] });

                const logEmbed = new EmbedBuilder()
                    .setTitle('🤖 Auto-Closed')
                    .addFields({ name: 'User', value: member.user.tag, inline: true }, { name: 'Category', value: ticket.category, inline: true })
                    .setColor('#FFA500').setTimestamp();
                await Logger.logTicketAction(client, member.guild.id, logEmbed);

                setTimeout(() => channel.delete().catch(() => {}), 5000);
            }
        } catch (error) {
            console.error('Member remove error:', error);
        }
    }
};
