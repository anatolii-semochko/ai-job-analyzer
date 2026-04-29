const success = (res, data) => {
    res.json({ success: true, data })
}

const badResponse = (context, res, req, error) => {
    console.error(`[${context}] Error:`, error)
    res.status(500).json({
        success: false,
        error: error.message || 'Internal server error',
    })
}

module.exports = { success, badResponse }
