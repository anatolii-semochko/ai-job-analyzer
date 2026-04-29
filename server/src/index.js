require('dotenv').config()

const express = require('express')
const path = require('path')
const cors = require('cors')
const routes = require('./routes')

const app = express()
const PORT = process.env.PORT || 3747

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/node', routes)

const distPath = path.resolve(__dirname, '../../client/dist')
app.use(express.static(distPath))

app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
})

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
})
