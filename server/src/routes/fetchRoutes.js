const express = require('express')
const router = express.Router()
const { fetchUrl, fetchBatch } = require('../controllers/fetchController')

router.get('/', fetchUrl)
router.post('/batch', fetchBatch)

module.exports = router
