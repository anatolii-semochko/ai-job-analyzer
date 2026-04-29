const express = require('express')
const router = express.Router()
const aiController = require('../controllers/aiController')

router.post('/agent', aiController.runAgent)

module.exports = router
