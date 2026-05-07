const mongoose = require('mongoose');

const colors = {
    green: (text) => `\x1b[32m${text}\x1b[0m`,
    red: (text) => `\x1b[31m${text}\x1b[0m`,
    blue: (text) => `\x1b[34m${text}\x1b[0m`,
};

// ═══════════════════════════════════
// TICKET SCHEMA
// ═══════════════════════════════════
const ticketSchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    channelId: { type: String, required: true },
    category: { type: String, default: 'general' },
    creatorId: { type: String, required: true },
    claimedBy: { type: String, default: null },
    status: {
        type: String,
        enum: ['open', 'closed', 'deleted'],
        default: 'open'
    },
    ticketNumber: { type: Number, required: true },
    closeReason: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
    closedAt: { type: Date, default: null },
    closedBy: { type: String, default: null },
    transcriptUrl: { type: String, default: null }
});

// ═══════════════════════════════════
// PANEL SCHEMA (Active per-server)
// ═══════════════════════════════════
const panelSchema = new mongoose.Schema({
    guildId: { type: String, unique: true, required: true },
    channelId: { type: String, default: null },
    messageId: { type: String, default: null },
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Template', default: null },
    embed: {
        title: { type: String, default: '' },
        description: { type: String, default: '' },
        footer: { type: String, default: '' },
        icon: { type: String, default: '' },
        thumbnail: { type: String, default: '' },
        image: { type: String, default: '' },
        color: { type: String, default: '#FF0000' }
    },
    options: [{
        label: { type: String, default: '' },
        description: { type: String, default: '' },
        emoji: { type: String, default: '🎫' },
        categoryId: { type: String, default: '' },
        allowedRoles: [{ type: String }]
    }],
    adminRoles: [{ type: String }],
    supportRoles: [{ type: String }],
    logChannelId: { type: String, default: '' },
    ticketCount: { type: Number, default: 0 }
});

// ═══════════════════════════════════
// TEMPLATE SCHEMA
// ═══════════════════════════════════
const templateSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, default: '' },
    createdBy: { type: String, default: 'System' },
    isDefault: { type: Boolean, default: false },
    embed: {
        title: { type: String, default: '' },
        description: { type: String, default: '' },
        footer: { type: String, default: '' },
        icon: { type: String, default: '' },
        thumbnail: { type: String, default: '' },
        image: { type: String, default: '' },
        color: { type: String, default: '#FF0000' }
    },
    options: [{
        label: { type: String, default: '' },
        description: { type: String, default: '' },
        emoji: { type: String, default: '🎫' },
        categoryId: { type: String, default: '' },
        allowedRoles: [{ type: String }]
    }],
    adminRoles: [{ type: String }],
    supportRoles: [{ type: String }],
    logChannelId: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    usageCount: { type: Number, default: 0 }
});

// ═══════════════════════════════════
// SERVER CONFIG SCHEMA
// ═══════════════════════════════════
const serverConfigSchema = new mongoose.Schema({
    guildId: { type: String, unique: true, required: true },
    logChannelId: { type: String, default: '' },
    adminRoles: [{ type: String }],
    supportRoles: [{ type: String }],
    ownerId: { type: String, default: '' }
});

const Ticket = mongoose.model('Ticket', ticketSchema);
const Panel = mongoose.model('Panel', panelSchema);
const Template = mongoose.model('Template', templateSchema);
const ServerConfig = mongoose.model('ServerConfig', serverConfigSchema);

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log(colors.green('✅ Connected to MongoDB successfully!'));
        
        // Create default templates only if none exist
        const count = await Template.countDocuments();
        if (count === 0) {
            console.log(colors.blue('📝 Creating default templates...'));
            await createDefaultTemplates();
        }
    } catch (error) {
        console.error(colors.red('❌ MongoDB connection error:'), error);
        throw error;
    }
}

async function createDefaultTemplates() {
    const defaults = [
        {
            name: '🔥 Premium Red Ticket',
            description: 'Professional red & black themed ticket panel for premium servers',
            isDefault: true,
            embed: {
                title: '🎫 PREMIUM TICKET SYSTEM',
                description: '> **Welcome to our premium support!**\n\n```diff\n+ Fast Response\n+ 24/7 Support\n+ Professional Team\n```\n\n🔴 **Select a category below to create your ticket.**',
                footer: '🔴 Warrior Ticket Bot • Premium',
                color: '#FF0000',
                thumbnail: '',
                image: '',
                icon: ''
            },
            options: [
                { label: '🛒 Purchase', description: 'Buy premium products & services', emoji: '🛒', categoryId: '', allowedRoles: [] },
                { label: '💬 Support', description: 'Get technical support & help', emoji: '💬', categoryId: '', allowedRoles: [] },
                { label: '🤝 Partnership', description: 'Apply for partnership program', emoji: '🤝', categoryId: '', allowedRoles: [] },
                { label: '⚠️ Report', description: 'Report a user or issue', emoji: '⚠️', categoryId: '', allowedRoles: [] }
            ]
        },
        {
            name: '💼 Business Professional',
            description: 'Clean blue themed ticket panel for businesses & organizations',
            isDefault: false,
            embed: {
                title: '📋 SUPPORT CENTER',
                description: 'Welcome to our support center! Please select the appropriate category below and our team will assist you shortly.',
                footer: '💼 Professional Support Team',
                color: '#5865F2',
                thumbnail: '',
                image: '',
                icon: ''
            },
            options: [
                { label: '🔧 Technical Support', description: 'Get help with technical issues', emoji: '🔧', categoryId: '', allowedRoles: [] },
                { label: '💳 Billing', description: 'Questions about billing & payments', emoji: '💳', categoryId: '', allowedRoles: [] },
                { label: '📦 Orders', description: 'Track or inquire about orders', emoji: '📦', categoryId: '', allowedRoles: [] }
            ]
        },
        {
            name: '🎮 Gaming Community',
            description: 'Gaming-themed ticket panel with multiple support categories',
            isDefault: false,
            embed: {
                title: '🎮 GAMING COMMUNITY TICKETS',
                description: '```yaml\nNeed help? Select a category below!\nOur staff team is ready to assist you.\n```',
                footer: '🎮 Gaming Community • Support',
                color: '#9B59B6',
                thumbnail: '',
                image: '',
                icon: ''
            },
            options: [
                { label: '🚫 Report Player', description: 'Report rule violations', emoji: '🚫', categoryId: '', allowedRoles: [] },
                { label: '📝 Staff Application', description: 'Apply for staff position', emoji: '📝', categoryId: '', allowedRoles: [] },
                { label: '🔓 Ban Appeal', description: 'Appeal your ban', emoji: '🔓', categoryId: '', allowedRoles: [] },
                { label: '❓ General Help', description: 'General questions & help', emoji: '❓', categoryId: '', allowedRoles: [] }
            ]
        },
        {
            name: '🛒 Shop & Orders',
            description: 'E-commerce focused ticket panel for shops',
            isDefault: false,
            embed: {
                title: '🛍️ ORDER SUPPORT',
                description: 'Need help with your order? Select the relevant category below.',
                footer: '🛒 Shop Support Team',
                color: '#E67E22',
                thumbnail: '',
                image: '',
                icon: ''
            },
            options: [
                { label: '📦 Order Status', description: 'Check your order status', emoji: '📦', categoryId: '', allowedRoles: [] },
                { label: '💰 Refund Request', description: 'Request a refund', emoji: '💰', categoryId: '', allowedRoles: [] },
                { label: '🔄 Exchange', description: 'Exchange a product', emoji: '🔄', categoryId: '', allowedRoles: [] }
            ]
        }
    ];

    await Template.insertMany(defaults);
    console.log(colors.green(`✅ Created ${defaults.length} default templates!`));
}

module.exports = { connectDB, Ticket, Panel, Template, ServerConfig };
