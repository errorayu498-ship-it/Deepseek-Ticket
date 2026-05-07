module.exports = {
    // Main emojis
    ticket_open: '🎫',
    ticket_close: '🔒',
    ticket_claim: '✋',
    ticket_transcript: '📝',
    
    // Status
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    
    // Categories
    buy: '🛒',
    support: '💬',
    partnership: '🤝',
    report: '🚫',
    
    // Actions
    lock: '🔒',
    unlock: '🔓',
    delete: '🗑️',
    save: '💾',
    refresh: '🔄',
    
    // UI
    loading: '⏳',
    ping: '📶',
    users: '👥',
    server: '🖥️',
    crown: '👑',
    shield: '🛡️',
    star: '⭐',
    gear: '⚙️',
    link: '🔗',
    
    get: function(emojiName) {
        return this[emojiName] || '❓';
    }
};
