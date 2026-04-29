const { runAgent } = require('../ai/agent')
const { success, badResponse } = require('../utils/controller')

class AiController {
    async runAgent(req, res) {
        const { message } = req.body

        try {
            const result = await runAgent(message)
            success(res, result)
        } catch (error) {
            badResponse('Run AI agent', res, req, error)
        }
    }
}

module.exports = new AiController()
