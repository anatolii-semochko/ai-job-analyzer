export const name = 'jobright'
export const label = 'JobRight AI'

export const browserScript = `async function scrapeJobRightJobs() {
    console.log('[JobRight] Starting job scraping...')

    const maxAttempts = 30
    const results = []
    let attempts = 0

    // Wait for page to fully load
    while (attempts < maxAttempts) {
        attempts++
        console.log('⏳ Waiting for content to load... ' + attempts + '/' + maxAttempts)

        // Look for job cards or job listing elements
        const jobCards = document.querySelectorAll('[data-testid*="job"], .job-card, .job-item, [class*="job-"], a[href*="/job/"], [class*="JobCard"], [class*="job-listing"]')

        if (jobCards.length > 0) {
            console.log('[JobRight] Found ' + jobCards.length + ' job elements')
            break
        }

        if (attempts >= maxAttempts) {
            console.log('[JobRight] Timeout - no job elements found')
            return JSON.stringify([])
        }

        await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // Look for job URLs that can be fetched
    const jobUrls = []
    const links = document.querySelectorAll('a[href*="/job/"]')

    for (let link of links) {
        const href = link.href
        if (href && href.includes('/job/') && !jobUrls.includes(href)) {
            jobUrls.push(href)
        }
    }

    console.log('[JobRight] Found ' + jobUrls.length + ' job URLs to fetch')

    // Fetch job details from each URL
    for (let i = 0; i < Math.min(jobUrls.length, 50); i++) { // Limit to 50 jobs
        const url = jobUrls[i]

        try {
            console.log('[JobRight] Fetching job ' + (i + 1) + '/' + Math.min(jobUrls.length, 50) + ': ' + url)

            const response = await fetch(url)
            if (!response.ok) {
                console.log('[JobRight] Failed to fetch: ' + response.status)
                continue
            }

            const html = await response.text()
            const parser = new DOMParser()
            const doc = parser.parseFromString(html, 'text/html')

            // Extract job information from the job detail page
            const job = extractJobFromDetailPage(doc, url)
            if (job) {
                results.push(job)
            }

        } catch (error) {
            console.log('[JobRight] Error fetching job: ' + error.message)
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log('[JobRight] Scraping complete. Found ' + results.length + ' jobs')
    return JSON.stringify(results)
}

function extractJobFromDetailPage(doc, url) {
    try {
        // Extract job ID from URL
        const jobIdMatch = url.match(/\\/job\\/(\\d+|[a-f0-9-]+)/i)
        const itemId = jobIdMatch ? jobIdMatch[1] : null

        // Look for job title - try multiple selectors
        let title = ''
        const titleSelectors = [
            'h1[data-testid*="title"]',
            'h1[class*="title"]',
            'h1[class*="job"]',
            '.job-title',
            '[data-testid*="job-title"]',
            'h1',
            'h2'
        ]

        for (let selector of titleSelectors) {
            const titleEl = doc.querySelector(selector)
            if (titleEl && titleEl.textContent.trim()) {
                title = titleEl.textContent.trim()
                break
            }
        }

        // Look for company name
        let company = ''
        const companySelectors = [
            '[data-testid*="company"]',
            '.company-name',
            '[class*="company"]',
            'a[href*="/company/"]'
        ]

        for (let selector of companySelectors) {
            const companyEl = doc.querySelector(selector)
            if (companyEl && companyEl.textContent.trim()) {
                company = companyEl.textContent.trim()
                break
            }
        }

        // Look for location
        let location = ''
        const locationSelectors = [
            '[data-testid*="location"]',
            '.location',
            '[class*="location"]',
            '[aria-label*="location"]'
        ]

        for (let selector of locationSelectors) {
            const locationEl = doc.querySelector(selector)
            if (locationEl && locationEl.textContent.trim()) {
                location = locationEl.textContent.trim()
                break
            }
        }

        // Look for salary information in the full page text
        const bodyText = doc.body ? doc.body.textContent : ''
        const salary = parseSalary(bodyText)

        // Look for description
        let description = ''
        const descSelectors = [
            '[data-testid*="description"]',
            '.job-description',
            '[class*="description"]',
            '[class*="job-detail"]'
        ]

        for (let selector of descSelectors) {
            const descEl = doc.querySelector(selector)
            if (descEl && descEl.innerHTML) {
                description = descEl.innerHTML.trim()
                break
            }
        }

        if (!title) {
            console.log('[JobRight] Skipping job - no title found')
            return null
        }

        return {
            parser: 'jobright',
            itemId,
            title,
            company,
            country: location || 'United States',
            salary,
            datePublish: new Date().toISOString().split('T')[0], // Current date as fallback
            description,
            href: url
        }

    } catch (error) {
        console.log('[JobRight] Error extracting job: ' + error.message)
        return null
    }
}

function parseSalary(text) {
    if (!text) return null

    // Look for salary patterns in USD
    const salaryPatterns = [
        /\\$\\s*([\\d,]+(?:\\.\\d+)?)\\s*-\\s*\\$\\s*([\\d,]+(?:\\.\\d+)?)\\s*(?:per\\s+)?(?:year|annually|yr)/i,
        /\\$\\s*([\\d,]+(?:\\.\\d+)?)\\s*-\\s*\\$\\s*([\\d,]+(?:\\.\\d+)?)/i,
        /\\$\\s*([\\d,]+(?:\\.\\d+)?)\\s*(?:per\\s+)?(?:year|annually|yr)/i,
        /([\\d,]+(?:\\.\\d+)?)k\\s*-\\s*([\\d,]+(?:\\.\\d+)?)k/i,
        /([\\d,]+(?:\\.\\d+)?)k/i
    ]

    for (let pattern of salaryPatterns) {
        const match = text.match(pattern)
        if (match) {
            if (match[2]) {
                // Range found
                const min = parseFloat(match[1].replace(/,/g, ''))
                const max = parseFloat(match[2].replace(/,/g, ''))
                const avg = (min + max) / 2

                // Convert K notation to actual numbers
                if (text.includes('k') || text.includes('K')) {
                    return Math.round((avg * 1000) / 12) // Convert to monthly
                }

                // Convert yearly to monthly
                if (avg > 10000) {
                    return Math.round(avg / 12)
                }
                return Math.round(avg)
            } else {
                // Single value found
                let value = parseFloat(match[1].replace(/,/g, ''))

                // Convert K notation
                if (text.includes('k') || text.includes('K')) {
                    value = value * 1000
                }

                // Convert yearly to monthly
                if (value > 10000) {
                    return Math.round(value / 12)
                }
                return Math.round(value)
            }
        }
    }

    return null
}

// Start scraping
scrapeJobRightJobs()`

const parseSalary = (text) => {
    if (!text) return null

    // USD salary patterns
    const patterns = [
        /\$\s*([\d,]+(?:\.\d+)?)\s*-\s*\$\s*([\d,]+(?:\.\d+)?)\s*(?:per\s+)?(?:year|annually|yr)/i,
        /\$\s*([\d,]+(?:\.\d+)?)\s*-\s*\$\s*([\d,]+(?:\.\d+)?)/i,
        /\$\s*([\d,]+(?:\.\d+)?)\s*(?:per\s+)?(?:year|annually|yr)/i,
        /([\d,]+(?:\.\d+)?)k\s*-\s*([\d,]+(?:\.\d+)?)k/i,
        /([\d,]+(?:\.\d+)?)k/i
    ]

    for (let pattern of patterns) {
        const match = text.match(pattern)
        if (match) {
            if (match[2]) {
                // Range found
                const min = parseFloat(match[1].replace(/,/g, ''))
                const max = parseFloat(match[2].replace(/,/g, ''))
                const avg = (min + max) / 2

                // Convert K notation to actual numbers
                if (text.includes('k') || text.includes('K')) {
                    return Math.round((avg * 1000) / 12) // Convert to monthly
                }

                // Convert yearly to monthly
                if (avg > 10000) {
                    return Math.round(avg / 12)
                }
                return Math.round(avg)
            } else {
                // Single value found
                let value = parseFloat(match[1].replace(/,/g, ''))

                // Convert K notation
                if (text.includes('k') || text.includes('K')) {
                    value = value * 1000
                }

                // Convert yearly to monthly
                if (value > 10000) {
                    return Math.round(value / 12)
                }
                return Math.round(value)
            }
        }
    }

    return null
}

const htmlToDom = (html) => {
    const parser = new DOMParser()
    return parser.parseFromString(html, 'text/html')
}

const getText = (el, selector) => {
    const node = el.querySelector(selector)
    return node ? node.textContent.trim().replace(/\s+/g, ' ') : ''
}

const extractJobId = (href) => {
    if (!href) return null
    // JobRight uses /jobs/info/ pattern
    const match = href.match(/\/jobs\/info\/([a-zA-Z0-9]+)/i)
    return match ? match[1] : null
}

const parseJobFromHtml = async (html) => {
    const doc = htmlToDom(html)
    const jobs = []

    // Extract job URLs from HTML using regex
    const urlRegex = /\/jobs\/info\/([a-zA-Z0-9]+)/g
    let match
    const foundUrls = new Set()

    while ((match = urlRegex.exec(html)) !== null) {
        const url = match[0]
        foundUrls.add(url)
    }

    console.log(`[JobRight] Found ${foundUrls.size} job URLs in HTML`)

    // Fetch details for each job URL
    const urlArray = Array.from(foundUrls)
    for (let i = 0; i < urlArray.length; i++) {
        const url = urlArray[i]
        const fullHref = `https://jobright.ai${url}`
        const itemId = extractJobId(url)

        console.log(`[JobRight] Fetching job ${i + 1}/${urlArray.length}: ${fullHref}`)

        try {
            // Use proxy to avoid CORS issues
            const proxyUrl = `/node/proxy?url=${encodeURIComponent(fullHref)}`
            const response = await fetch(proxyUrl)
            if (!response.ok) {
                console.log(`[JobRight] Failed to fetch ${fullHref}: ${response.status}`)
                continue
            }

            const responseData = await response.json()
            if (!responseData.success) {
                console.log(`[JobRight] Proxy error for ${fullHref}: ${responseData.error}`)
                continue
            }

            const jobHtml = responseData.data
            const jobDoc = htmlToDom(jobHtml)

            // Extract job details from the job page
            const job = extractJobDetailsFromPage(jobDoc, fullHref, itemId)
            if (job) {
                jobs.push(job)
                console.log(`[JobRight] Job added: ${job.title}`)
            }

        } catch (error) {
            console.log(`[JobRight] Error fetching ${fullHref}: ${error.message}`)
        }

        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 200))
    }

    return jobs
}

const extractJobDetailsFromPage = (doc, url, itemId) => {
    try {
        // JobRight stores job data in JSON script tag
        const jsonScript = doc.querySelector('script[id="jobright-helper-job-detail-info"]')

        if (jsonScript && jsonScript.textContent) {
            try {
                const jobData = JSON.parse(jsonScript.textContent)
                const jobResult = jobData.jobResult
                const companyResult = jobData.companyResult

                if (jobResult) {
                    // Convert salary to monthly if available
                    let salary = null
                    if (jobResult.minSalary && jobResult.maxSalary) {
                        const avgSalary = (jobResult.minSalary + jobResult.maxSalary) / 2
                        salary = Math.round(avgSalary / 12) // Convert yearly to monthly
                    }

                    // Parse job description from JSON schema
                    let description = jobResult.jobSummary || ''

                    // Try to get description from JSON-LD script as well
                    const jsonLdScript = doc.querySelector('script[id="job-posting"]')
                    if (jsonLdScript && jsonLdScript.textContent) {
                        try {
                            const jsonLd = JSON.parse(jsonLdScript.textContent)
                            if (jsonLd.description) {
                                description = jsonLd.description
                            }
                        } catch (e) {
                            // Ignore JSON-LD parse errors
                        }
                    }

                    return {
                        parser: name,
                        itemId,
                        title: jobResult.jobTitle || jobResult.jobNlpTitle || '',
                        company: companyResult?.companyName || '',
                        country: jobResult.jobLocation || 'United States',
                        salary,
                        datePublish: jobResult.publishTime ? jobResult.publishTime.split(' ')[0] : new Date().toISOString().split('T')[0],
                        description,
                        href: url
                    }
                }
            } catch (e) {
                console.log(`[JobRight] Error parsing JSON data for ${itemId}: ${e.message}`)
            }
        }

        // Fallback to HTML parsing if JSON not found
        const title = doc.querySelector('title')?.textContent?.split(' @ ')[0]?.replace(' | Jobright.ai', '') || ''

        if (!title) {
            console.log(`[JobRight] Skipping job - no title found for ${itemId}`)
            return null
        }

        return {
            parser: name,
            itemId,
            title,
            company: '',
            country: 'United States',
            salary: null,
            datePublish: new Date().toISOString().split('T')[0],
            description: '',
            href: url
        }

    } catch (error) {
        console.log(`[JobRight] Error extracting job details: ${error.message}`)
        return null
    }
}

export const parse = async (data) => {
    console.log('[JobRight] Starting parse...')

    if (typeof data === 'string') {
        const trimmed = data.trim()

        // Check if it's JSON array
        if (trimmed.startsWith('[')) {
            try {
                const jobsArray = JSON.parse(trimmed)
                console.log('[JobRight] Parsed JSON array with', jobsArray.length, 'items')
                return processJobsArray(jobsArray)
            } catch (e) {
                console.error('[JobRight] Failed to parse JSON:', e)
                return []
            }
        }

        // Check if it's HTML
        if (trimmed.includes('<html') || trimmed.includes('<!DOCTYPE') || trimmed.includes('jobright')) {
            console.log('[JobRight] Processing HTML page...')

            try {
                const jobs = await parseJobFromHtml(trimmed)
                if (jobs.length === 0) {
                    console.log('[JobRight] No job data found in HTML. This appears to be a Single Page Application.')
                    console.log('[JobRight] Please use the browser script instead:')
                    console.log('[JobRight] 1. Go to JobRight job recommendations page')
                    console.log('[JobRight] 2. Open browser console (F12)')
                    console.log('[JobRight] 3. Copy and paste the script shown below the textarea')
                    console.log('[JobRight] 4. Run the script and paste the JSON result here')
                    return []
                }

                return jobs
            } catch (error) {
                console.error('[JobRight] Error processing HTML:', error)
                return []
            }
        }

        console.error('[JobRight] Unknown data format')
        return []
    } else if (Array.isArray(data)) {
        return processJobsArray(data)
    }

    return []
}

const processJobsArray = (jobsArray) => {
    const jobs = []

    for (let i = 0; i < jobsArray.length; i++) {
        console.log(`[JobRight] Processing item ${i + 1}/${jobsArray.length}`)
        try {
            const jobData = jobsArray[i]

            if (!jobData || typeof jobData !== 'object') {
                console.log('[JobRight] Skipped - invalid job data')
                continue
            }

            const {
                title,
                company,
                country,
                salary: salaryValue,
                datePublish,
                description,
                href,
                itemId
            } = jobData

            const salary = typeof salaryValue === 'string' ? parseSalary(salaryValue) : salaryValue

            if (!title) {
                console.log('[JobRight] Skipped - no title')
                continue
            }

            const job = {
                parser: name,
                itemId: itemId || null,
                title: title.trim(),
                company: company ? company.trim() : '',
                country: country ? country.trim() : 'United States',
                salary,
                datePublish: datePublish || new Date().toISOString().split('T')[0],
                description: description || '',
                href: href || '',
            }

            jobs.push(job)
            console.log('[JobRight] Job added:', job.title)
        } catch (e) {
            console.error('[JobRight] Failed to parse item', i, e)
        }
    }

    console.log('[JobRight] Parse complete. Total jobs:', jobs.length)
    return jobs
}

export const validate = (data) => {
    if (typeof data !== 'string') return false
    return data.includes('jobright') ||
           data.includes('jobright.ai') ||
           data.includes('JobRight')
}

export default {
    name,
    label,
    parse,
    validate,
    browserScript,
}