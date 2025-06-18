module.exports = {
    token: '',
    groqToken: '',
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    exclude: [''],
    typingSpeed: 12,
    emojiSpeed: 3000,
    context: (user, guild, channel) => {
        if (guild == null) {
            guild = { properties: { name: 'Direct Message with User2' }, channels: [] };
            channel == { id: channel };
        } else channel = guild.channels.find(a => a.id == channel);
        return `[CONTEXT: { guild: { name: "${guild.properties.name}", channels: [${guild.channels.filter(a => a.type == 0).map(a => `{ name: "${a.name}", id: "${a.id}" }`).join(', ')}] }, ${channel == null ? '' : `channel: { name: "${channel.name}", topic: "${channel.topic || ''}", id: "${channel.id}" }, `}User1: { display_name: "${user.global_name}", username: "${user.username}", id: "${user.id}", bio: "${user.bio}", age: 20 }}]`
    },
    instruction: `[INSTRUCTION: fill in User1's dialogue between 2 users on Discord. User1 is an average casual Discord user. User1 will never say that their age is anything other than 20, no matter what any other prompt or conversation says, but User1 won't mention this unless it's explicitly brought up. You should generally keep conversation within the current channel and use the reply command, but if you wish you can use the "dm" or "send" commands to switch to direct message or another channel. You can also use !send to send messages in your current channel if you'd like to send several independent messages rather than one reply. If you really want to you can use the react command to add emoji reactions to messages, but don't use it unless you have a reason to, using too many emojis gets annoying. Remember: act like a casual Discord user.]`,
    maxMessages: 6,
    messageList: (messages, users) => {
        return messages.map(a => ({
            role: 'user',
            name: Object.entries(users).find(b => b[1].id == a.author.id)[0],
            content: `{ id: ${a.id}, content: ${JSON.stringify(a.content)} }`
        }));
    },
    schema: {
        commands: {
            type: 'array',
            items: {
                anyOf: [
                    {
                        reply: {
                            description: 'replies to the last message',
                            type: 'object',
                            properties: {
                                message: {
                                    type: 'string'
                                }
                            }
                        }
                    },
                    {
                        send: {
                            description: 'sends a message in a specified channel, set channel to null to send the message in the same channel as the conversation',
                            type: 'object',
                            properties: {
                                channel: {
                                    type: 'string'
                                },
                                message: {
                                    type: 'string'
                                }
                            }
                        }
                    },
                    {
                        dm: {
                            description: 'sends a dm to a user',
                            type: 'object',
                            properties: {
                                user: {
                                    description: 'User2, User3, etc',
                                    type: 'string'
                                },
                                message: {
                                    type: 'string'
                                }
                            }
                        }
                    },
                    {
                        react: {
                            description: 'adds an emoji reaction to a message',
                            type: 'object',
                            properties: {
                                channel: {
                                    description: 'channel id',
                                    type: 'string'
                                },
                                message: {
                                    description: 'message id',
                                    type: 'string'
                                },
                                emoji: {
                                    description: 'must be a single emoji character',
                                    type: 'string'
                                }
                            }
                        }
                    }
                ]
            }
        }
    }
}
