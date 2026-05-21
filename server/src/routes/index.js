const express = require('express')
const router = express.Router()
const fetchRoutes = require('./fetchRoutes')
const aiRoutes = require('./aiRoutes')

router.use('/fetch', fetchRoutes)
router.use('/ai', aiRoutes)

// Proxy route for JobRight parser
router.use('/proxy', fetchRoutes)

module.exports = router
