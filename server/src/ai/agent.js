const { openai } = require('./ai')

async function runAgent(userMessage) {
    const response = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
            { role: 'user', content: userMessage },
        ],
    })

    const message = response.choices[0].message

    console.log({ aiAgent: { usage: response.usage } })

    return {
        message: message.content,
        usage: response.usage,
    }
}

module.exports = { runAgent }
