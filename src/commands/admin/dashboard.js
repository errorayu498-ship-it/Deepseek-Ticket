const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dashboard')
        .setDescription('🔗 Get web dashboard link'),

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });

        const member = await interaction.guild.members.fetch(interaction.user.id);
        const hasPerm = member.permissions.has(PermissionFlagsBits.Administrator) || 
            member.id === interaction.guild.ownerId || member.id === process.env.OWNER_ID;

        if (!hasPerm) {
            return interaction.editReply({ embeds: [new EmbedBuilder().setTitle('🔒 Access Denied').setDescription('Only admins can access.').setColor('#FF0000')] });
        }

        const portalUrl = process.env.PORTAL_URL || `http://localhost:${process.env.PORTAL_PORT || 3000}`;

        const embed = new EmbedBuilder()
            .setTitle('Warrior Ticket Dashboard')
            .setDescription('Manage your ticket bot from the web portal.')
            .addFields(
                { name: '⚙️ Configure', value: `${portalUrl}/guild/${interaction.guild.id}`, inline: false },
                { name: '📁 Templates', value: `${portalUrl}/templates`, inline: false },
                { name: '🔐 Portal', value: portalUrl, inline: false }
            )
            .setColor('#FF0000').setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('⚙️ Configure Server').setURL(`${portalUrl}/guild/${interaction.guild.id}`).setStyle(ButtonStyle.Link),
            new ButtonBuilder().setLabel('📁 Templates').setURL(`${portalUrl}/templates`).setStyle(ButtonStyle.Link)
        );

        await interaction.editReply({ embeds: [embed], components: [row] });
    }
};
