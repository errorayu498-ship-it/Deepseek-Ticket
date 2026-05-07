const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const { Panel, Ticket, ServerConfig, Template } = require('../database/mongodb');
const EmbedCreator = require('../utils/embeds');
const fs = require('fs');

const app = express();

const viewsDir = path.join(__dirname, 'views');
if (!fs.existsSync(viewsDir)) fs.mkdirSync(viewsDir, { recursive: true });

app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'warrior-ticket-premium-2024-secure',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 86400000 }
}));

app.set('view engine', 'ejs');
app.set('views', viewsDir);

const requireAuth = (req, res, next) => {
    if (req.session.authenticated) next();
    else res.redirect('/login');
};

// ═══════ LOGIN ═══════
app.get('/login', (req, res) => res.render('login', { error: null, botName: 'WARRIOR TICKET' }));
app.post('/login', (req, res) => {
    req.body.password === process.env.PORTAL_PASSWORD 
        ? (req.session.authenticated = true, res.redirect('/'))
        : res.render('login', { error: '⛔ INVALID PASSWORD!', botName: 'WARRIOR TICKET' });
});
app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/login'); });

// ═══════ DASHBOARD ═══════
app.get('/', requireAuth, async (req, res) => {
    const client = req.app.get('client');
    const guilds = client.guilds.cache.map(g => ({ id: g.id, name: g.name, memberCount: g.memberCount, icon: g.iconURL({ dynamic: true }) }));
    const [totalTickets, openTickets, closedTickets, templates] = await Promise.all([
        Ticket.countDocuments(), Ticket.countDocuments({ status: 'open' }), Ticket.countDocuments({ status: 'closed' }), Template.countDocuments()
    ]);
    res.render('dashboard', { guilds, stats: { totalServers: client.guilds.cache.size, totalMembers: client.users.cache.size, totalTickets, openTickets, closedTickets, totalTemplates: templates, ping: client.ws.ping }, botName: 'WARRIOR TICKET' });
});

// ═══════ TEMPLATES ═══════
app.get('/templates', requireAuth, async (req, res) => {
    const templates = await Template.find().sort({ createdAt: -1 });
    res.render('templates', { templates, botName: 'WARRIOR TICKET' });
});

app.get('/templates/create', requireAuth, (req, res) => {
    res.render('template-editor', { template: null, isNew: true, botName: 'WARRIOR TICKET', error: null });
});

app.get('/templates/:id/edit', requireAuth, async (req, res) => {
    const template = await Template.findById(req.params.id);
    if (!template) return res.status(404).send('Not found');
    res.render('template-editor', { template, isNew: false, botName: 'WARRIOR TICKET', error: null });
});

app.post('/templates/save', requireAuth, async (req, res) => {
    try {
        const { templateId, name, description, title, embedDescription, footer, color, thumbnail, image, icon } = req.body;
        const options = [];
        let i = 0;
        while (req.body[`option_${i}_label`]) {
            const label = req.body[`option_${i}_label`];
            if (label?.trim()) {
                options.push({
                    label: label.trim(),
                    description: (req.body[`option_${i}_description`] || '').trim(),
                    emoji: (req.body[`option_${i}_emoji`] || '🎫').trim(),
                    categoryId: (req.body[`option_${i}_categoryId`] || '').trim(),
                    allowedRoles: Array.isArray(req.body[`option_${i}_allowedRoles`]) ? req.body[`option_${i}_allowedRoles`].filter(Boolean) : []
                });
            }
            i++;
        }
        if (!options.length) options.push({ label: 'General', description: 'Open ticket', emoji: '🎫', categoryId: '', allowedRoles: [] });

        const parseRoles = (input) => input ? (Array.isArray(input) ? input.filter(Boolean) : [input].filter(Boolean)) : [];

        const data = {
            name: name || 'Untitled', description: description || '',
            embed: { title: title || '', description: embedDescription || '', footer: footer || '', color: color || '#FF0000', thumbnail: thumbnail || '', image: image || '', icon: icon || '' },
            options, adminRoles: parseRoles(req.body.adminRoles), supportRoles: parseRoles(req.body.supportRoles),
            logChannelId: (req.body.logChannelId || '').trim(), updatedAt: new Date()
        };

        if (templateId) {
            await Template.findByIdAndUpdate(templateId, data);
            res.json({ success: true, message: '✅ Template updated!', templateId });
        } else {
            const t = await Template.create({ ...data, createdBy: 'Portal', createdAt: new Date() });
            res.json({ success: true, message: '✅ Template created!', templateId: t._id });
        }
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.post('/templates/:id/delete', requireAuth, async (req, res) => {
    await Template.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
});

app.post('/templates/:id/duplicate', requireAuth, async (req, res) => {
    const orig = await Template.findById(req.params.id);
    if (!orig) return res.status(404).json({ success: false });
    const dup = await Template.create({ ...orig.toObject(), _id: undefined, name: orig.name + ' (Copy)', isDefault: false, usageCount: 0, createdAt: new Date(), updatedAt: new Date() });
    res.json({ success: true, templateId: dup._id });
});

// ═══════ GUILD CONFIG ═══════
app.get('/guild/:guildId', requireAuth, async (req, res) => {
    const client = req.app.get('client');
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).send('Guild not found');

    let panel = await Panel.findOne({ guildId: guild.id }).populate('templateId');
    const templates = await Template.find().sort({ name: 1 });
    const roles = guild.roles.cache.filter(r => !r.managed && r.name !== '@everyone').map(r => ({ id: r.id, name: r.name, position: r.position })).sort((a, b) => b.position - a.position);
    const categories = guild.channels.cache.filter(c => c.type === 4).map(c => ({ id: c.id, name: c.name }));
    const channels = guild.channels.cache.filter(c => c.type === 0).map(c => ({ id: c.id, name: c.name }));

    res.render('guild-config', { guild, panel: panel || { embed: {}, options: [] }, templates, roles, categories, channels, botName: 'WARRIOR TICKET' });
});

app.post('/guild/:guildId/apply-template', requireAuth, async (req, res) => {
    try {
        const template = await Template.findById(req.body.templateId);
        if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

        await Panel.findOneAndUpdate(
            { guildId: req.params.guildId },
            { templateId: template._id, embed: template.embed, options: template.options, adminRoles: template.adminRoles || [], supportRoles: template.supportRoles || [], logChannelId: template.logChannelId || '' },
            { upsert: true }
        );
        await Template.findByIdAndUpdate(template._id, { $inc: { usageCount: 1 } });

        res.json({ success: true, message: `✅ Template "${template.name}" applied!` });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.post('/guild/:guildId/send-panel', requireAuth, async (req, res) => {
    try {
        const { guildId } = req.params;
        const { channelId } = req.body;
        const client = req.app.get('client');
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return res.status(404).json({ success: false, message: 'Guild not found' });

        const channel = guild.channels.cache.get(channelId);
        if (!channel?.isTextBased()) return res.status(400).json({ success: false, message: 'Invalid channel' });

        let panel = await Panel.findOne({ guildId });
        if (!panel?.options?.length) return res.status(400).json({ success: false, message: 'No panel configured. Apply a template first!' });

        if (panel.messageId && panel.channelId) {
            try {
                const oc = guild.channels.cache.get(panel.channelId);
                if (oc) { const om = await oc.messages.fetch(panel.messageId).catch(() => null); if (om) await om.delete().catch(() => {}); }
            } catch (e) {}
        }

        const { StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
        const embed = await EmbedCreator.createTicketPanel(panel);
        const opts = panel.options.map(o => ({ label: o.label.substring(0, 100), description: (o.description || '').substring(0, 100), emoji: o.emoji || '🎫', value: o.label.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 100) }));
        const menu = new StringSelectMenuBuilder().setCustomId('ticket_create').setPlaceholder('🔴 SELECT TICKET CATEGORY').addOptions(opts);
        const msg = await channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] });

        panel.channelId = channel.id;
        panel.messageId = msg.id;
        await panel.save();

        res.json({ success: true, message: '✅ Panel sent!' });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.post('/guild/:guildId/refresh-panel', requireAuth, async (req, res) => {
    try {
        const client = req.app.get('client');
        const guild = client.guilds.cache.get(req.params.guildId);
        const panel = await Panel.findOne({ guildId: req.params.guildId });
        if (!panel?.messageId) return res.status(400).json({ success: false, message: 'No panel found' });

        const channel = guild.channels.cache.get(panel.channelId);
        const message = await channel?.messages.fetch(panel.messageId).catch(() => null);
        if (!message) return res.status(400).json({ success: false, message: 'Message not found' });

        const { StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
        const embed = await EmbedCreator.createTicketPanel(panel);
        const opts = panel.options.map(o => ({ label: o.label.substring(0, 100), description: (o.description || '').substring(0, 100), emoji: o.emoji || '🎫', value: o.label.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 100) }));
        await message.edit({ embeds: [embed], components: [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('ticket_create').setPlaceholder('🔴 SELECT TICKET CATEGORY').addOptions(opts))] });

        res.json({ success: true, message: '✅ Refreshed!' });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.get('/guild/:guildId/tickets', requireAuth, async (req, res) => {
    const client = req.app.get('client');
    const guild = client.guilds.cache.get(req.params.guildId);
    const tickets = await Ticket.find({ guildId: req.params.guildId, status: req.query.status || 'open' }).sort({ createdAt: -1 }).limit(100);
    res.render('tickets', { guild, tickets, status: req.query.status || 'open', botName: 'WARRIOR TICKET' });
});

app.get('/api/templates/:id/preview', requireAuth, async (req, res) => {
    const t = await Template.findById(req.params.id);
    t ? res.json(t) : res.status(404).json({ error: 'Not found' });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

function startWebServer(client) {
    app.set('client', client);
    const PORT = process.env.PORT || process.env.PORTAL_PORT || 3000;
    app.listen(PORT, () => console.log(`\x1b[31m🔴 PORTAL\x1b[0m → http://localhost:${PORT}`));
}

module.exports = { startWebServer };
