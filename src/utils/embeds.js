const { EmbedBuilder } = require('discord.js');

class EmbedCreator {
    static async createTicketPanel(panelData) {
        if (!panelData || !panelData.embed) {
            panelData = {
                embed: {
                    title: '🎫 Ticket System',
                    description: 'Select a category to create a ticket.',
                    footer: 'Ticket Bot',
                    color: '#FF0000'
                },
                options: []
            };
        }

        const embed = new EmbedBuilder()
            .setTitle(panelData.embed.title || '🎫 Ticket System')
            .setDescription(panelData.embed.description || 'Select a category to create a ticket.')
            .setColor(panelData.embed.color || '#FF0000')
            .setFooter({ text: panelData.embed.footer || 'Ticket Bot' })
            .setTimestamp();

        if (panelData.embed.thumbnail && panelData.embed.thumbnail.startsWith('http')) {
            embed.setThumbnail(panelData.embed.thumbnail);
        }
        if (panelData.embed.image && panelData.embed.image.startsWith('http')) {
            embed.setImage(panelData.embed.image);
        }
        if (panelData.embed.icon && panelData.embed.icon.startsWith('http')) {
            embed.setAuthor({ name: 'Ticket System', iconURL: panelData.embed.icon });
        }

        const options = panelData.options || [];
        if (options.length > 0) {
            const fieldsToShow = options.slice(0, 25);
            fieldsToShow.forEach(option => {
                if (option && option.label) {
                    embed.addFields({
                        name: `${option.emoji || '🎫'} ${option.label}`,
                        value: option.description || `Create a ${option.label} ticket`,
                        inline: true
                    });
                }
            });
        }

        return embed;
    }

    static createTicketOpened(ticket, user, category) {
        return new EmbedBuilder()
            .setTitle('🎫 Ticket Created!')
            .setDescription(
                `Welcome ${user}! Support staff will be with you shortly.\n\n` +
                `**Ticket:** #${ticket.ticketNumber || 'N/A'}\n` +
                `**Category:** ${category?.label || ticket.category || 'General'}\n` +
                `**Created By:** ${user.tag || user.username}\n\n` +
                `Please describe your issue in detail.`
            )
            .setColor('#00FF00')
            .setFooter({ text: 'Warrior Ticket • Open' })
            .setTimestamp();
    }

    static createTicketClosed(closedBy, reason) {
        return new EmbedBuilder()
            .setTitle('🔒 Ticket Closed')
            .setDescription(
                `This ticket has been closed by ${closedBy}\n\n` +
                `**Reason:** ${reason || 'No reason provided'}\n\n` +
                `This channel will be deleted in 5 seconds.`
            )
            .setColor('#FF0000')
            .setFooter({ text: 'Warrior Ticket • Closed' })
            .setTimestamp();
    }

    static errorEmbed(message) {
        return new EmbedBuilder()
            .setTitle('❌ Error')
            .setDescription(message || 'An error occurred')
            .setColor('#FF0000')
            .setFooter({ text: 'Warrior Ticket • Error' })
            .setTimestamp();
    }

    static successEmbed(message) {
        return new EmbedBuilder()
            .setTitle('✅ Success')
            .setDescription(message || 'Operation completed')
            .setColor('#00FF00')
            .setFooter({ text: 'Warrior Ticket • Success' })
            .setTimestamp();
    }
}

module.exports = EmbedCreator;
