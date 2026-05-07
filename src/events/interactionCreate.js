const { Events, ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { Panel, Ticket } = require('../database/mongodb');
const EmbedCreator = require('../utils/embeds');
const Logger = require('../utils/logger');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        try {
            // Slash commands
            if (interaction.isChatInputCommand()) {
                const command = client.commands.get(interaction.commandName);
                if (!command) return;
                await command.execute(interaction, client);
                return;
            }

            // Select menu - Ticket creation
            if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_create') {
                await handleTicketCreate(interaction, client);
                return;
            }

            // Buttons
            if (interaction.isButton()) {
                if (interaction.customId === 'ticket_close') {
                    await handleTicketClose(interaction, client);
                } else if (interaction.customId === 'ticket_claim') {
                    await handleTicketClaim(interaction, client);
                }
                return;
            }

        } catch (error) {
            console.error('Interaction error:', error);
            Logger.logError(client, error);
        }
    }
};

async function handleTicketCreate(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        const selectedValue = interaction.values[0];

        const panel = await Panel.findOne({ guildId });
        if (!panel || !panel.options || panel.options.length === 0) {
            return interaction.editReply({ embeds: [EmbedCreator.errorEmbed('No ticket panel configured. Ask an admin to set it up.')] });
        }

        const option = panel.options.find(opt => opt.label.toLowerCase().replace(/[^a-z0-9]/g, '_') === selectedValue);
        if (!option) {
            return interaction.editReply({ embeds: [EmbedCreator.errorEmbed('Invalid ticket category.')] });
        }

        // Check existing open ticket
        const existing = await Ticket.findOne({ guildId, creatorId: userId, status: 'open' });
        if (existing) {
            return interaction.editReply({ embeds: [EmbedCreator.errorEmbed(`You already have an open ticket: <#${existing.channelId}>`)] });
        }

        const ticketNumber = (panel.ticketCount || 0) + 1;
        const channelName = `ticket-${ticketNumber}-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20)}`;

        // Permissions
        const permissionOverwrites = [
            { id: guildId, deny: [PermissionFlagsBits.ViewChannel] },
            { id: userId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
            { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] },
        ];

        panel.adminRoles?.forEach(roleId => {
            permissionOverwrites.push({ id: roleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
        });
        option.allowedRoles?.forEach(roleId => {
            permissionOverwrites.push({ id: roleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
        });

        const ticketChannel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: option.categoryId || null,
            permissionOverwrites,
        });

        const ticket = new Ticket({
            guildId, channelId: ticketChannel.id,
            category: option.label, creatorId: userId,
            ticketNumber, status: 'open'
        });
        await ticket.save();

        panel.ticketCount = ticketNumber;
        await panel.save();

        const welcomeEmbed = EmbedCreator.createTicketOpened(ticket, interaction.user, option);
        const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_close').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
            new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setStyle(ButtonStyle.Success).setEmoji('✋'),
        );

        const msg = await ticketChannel.send({ content: `${interaction.user}`, embeds: [welcomeEmbed], components: [actionRow] });
        await msg.pin().catch(() => {});

        // Log
        const logEmbed = new EmbedBuilder()
            .setTitle('🎫 Ticket Created')
            .addFields(
                { name: 'Ticket', value: `#${ticketNumber}`, inline: true },
                { name: 'User', value: `${interaction.user.tag}`, inline: true },
                { name: 'Category', value: option.label, inline: true },
                { name: 'Channel', value: `${ticketChannel}`, inline: true }
            )
            .setColor('#00FF00').setTimestamp();
        await Logger.logTicketAction(client, guildId, logEmbed);

        await interaction.editReply({ embeds: [EmbedCreator.successEmbed(`Ticket created! ${ticketChannel}`)] });

    } catch (error) {
        console.error('Create ticket error:', error);
        await interaction.editReply({ embeds: [EmbedCreator.errorEmbed('Failed to create ticket.')] }).catch(() => {});
    }
}

async function handleTicketClose(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const guildId = interaction.guild.id;
        const channelId = interaction.channel.id;

        const ticket = await Ticket.findOne({ guildId, channelId, status: 'open' });
        if (!ticket) return interaction.editReply({ embeds: [EmbedCreator.errorEmbed('Not an open ticket.')] });

        const panel = await Panel.findOne({ guildId });
        const member = await interaction.guild.members.fetch(interaction.user.id);
        
        const hasPerm = member.permissions.has(PermissionFlagsBits.Administrator) ||
            member.id === ticket.creatorId || member.id === process.env.OWNER_ID ||
            panel?.adminRoles?.some(r => member.roles.cache.has(r));

        if (!hasPerm) return interaction.editReply({ embeds: [EmbedCreator.errorEmbed('No permission.')] });

        ticket.status = 'closed';
        ticket.closedAt = new Date();
        ticket.closedBy = interaction.user.id;
        await ticket.save();

        // DM user
        try {
            const creator = await client.users.fetch(ticket.creatorId);
            const dmEmbed = new EmbedBuilder()
                .setTitle('Ticket Closed')
                .setDescription(`Your ticket #${ticket.ticketNumber} in **${interaction.guild.name}** was closed.`)
                .setColor('#FF0000').setTimestamp();
            await creator.send({ embeds: [dmEmbed] }).catch(() => {});
        } catch (e) {}

        const closeEmbed = EmbedCreator.createTicketClosed(interaction.user, 'Resolved');
        await interaction.channel.send({ embeds: [closeEmbed] });

        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);

        await interaction.editReply({ embeds: [EmbedCreator.successEmbed('Ticket closed.')] });

    } catch (error) {
        console.error('Close ticket error:', error);
        await interaction.editReply({ embeds: [EmbedCreator.errorEmbed('Error closing ticket.')] }).catch(() => {});
    }
}

async function handleTicketClaim(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const { guildId, channelId } = interaction;
        const ticket = await Ticket.findOne({ guildId, channelId, status: 'open' });
        if (!ticket) return interaction.editReply({ embeds: [EmbedCreator.errorEmbed('Not an open ticket.')] });
        if (ticket.claimedBy) return interaction.editReply({ embeds: [EmbedCreator.errorEmbed(`Claimed by <@${ticket.claimedBy}>`)] });

        const panel = await Panel.findOne({ guildId });
        const member = await interaction.guild.members.fetch(interaction.user.id);
        
        const hasPerm = member.permissions.has(PermissionFlagsBits.Administrator) ||
            panel?.adminRoles?.some(r => member.roles.cache.has(r)) ||
            panel?.supportRoles?.some(r => member.roles.cache.has(r));

        if (!hasPerm) return interaction.editReply({ embeds: [EmbedCreator.errorEmbed('No permission.')] });

        ticket.claimedBy = interaction.user.id;
        await ticket.save();

        const claimEmbed = new EmbedBuilder().setTitle('✋ Ticket Claimed').setDescription(`Claimed by ${interaction.user}`).setColor('#FFA500');
        await interaction.channel.send({ embeds: [claimEmbed] });

        await interaction.editReply({ embeds: [EmbedCreator.successEmbed('Ticket claimed!')] });

    } catch (error) {
        console.error('Claim error:', error);
        await interaction.editReply({ embeds: [EmbedCreator.errorEmbed('Error claiming ticket.')] }).catch(() => {});
    }
}
