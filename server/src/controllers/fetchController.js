const allowedDomains = [
    'jobs.dou.ua',
    'dou.ua',
    'djinni.co',
    'www.linkedin.com',
    'linkedin.com',
    'jobright.ai',
    'www.jobright.ai',
]

const validateUrl = (url) => {
    try {
        const parsedUrl = new URL(url)
        if (!allowedDomains.some(domain => parsedUrl.hostname.includes(domain))) {
            return { valid: false, error: `Domain not allowed: ${parsedUrl.hostname}` }
        }
        return { valid: true }
    } catch (e) {
        return { valid: false, error: 'Invalid URL format' }
    }
}

const fetchSingleUrl = async (url) => {
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7',
        },
    })

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response.text()
}

const fetchUrl = async (req, res) => {
    const { url } = req.query

    if (!url) {
        return res.status(400).json({ success: false, error: 'URL parameter is required' })
    }

    const validation = validateUrl(url)
    if (!validation.valid) {
        return res.status(400).json({ success: false, error: validation.error })
    }

    try {
        console.log(`[FetchController] Fetching: ${url}`)
        const html = await fetchSingleUrl(url)
        console.log(`[FetchController] Fetched ${html.length} bytes`)
        res.json({ success: true, data: html })
    } catch (error) {
        console.error('[FetchController] Error:', error)
        res.status(500).json({ success: false, error: error.message })
    }
}

const fetchBatch = async (req, res) => {
    const { urls } = req.body

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ success: false, error: 'urls array is required' })
    }

    if (urls.length > 100) {
        return res.status(400).json({ success: false, error: 'Maximum 100 URLs per batch' })
    }

    for (const url of urls) {
        const validation = validateUrl(url)
        if (!validation.valid) {
            return res.status(400).json({ success: false, error: `Invalid URL "${url}": ${validation.error}` })
        }
    }

    console.log(`[FetchController] Batch fetching ${urls.length} URLs`)

    const results = []
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

    for (let i = 0; i < urls.length; i++) {
        const url = urls[i]
        try {
            console.log(`[FetchController] Fetching ${i + 1}/${urls.length}: ${url}`)
            const html = await fetchSingleUrl(url)
            results.push({ url, success: true, html })
        } catch (error) {
            console.error(`[FetchController] Error fetching ${url}:`, error.message)
            results.push({ url, success: false, error: error.message })
        }

        if (i < urls.length - 1) {
            await delay(300)
        }
    }

    const successful = results.filter(r => r.success).length
    console.log(`[FetchController] Batch complete: ${successful}/${urls.length} successful`)

    res.json({ success: true, data: results })
}

module.exports = { fetchUrl, fetchBatch }
