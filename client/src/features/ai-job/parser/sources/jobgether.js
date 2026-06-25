export const name = 'jobgether'
export const label = 'Jobgether'

export const browserScript = `async function scrapeJobgetherJobs() {
    console.log('[Jobgether] Starting enhanced job scraping...')

    const maxAttempts = 30
    const results = []
    let attempts = 0

    // Wait for page to fully load
    while (attempts < maxAttempts) {
        attempts++
        console.log('⏳ Waiting for content to load... ' + attempts + '/' + maxAttempts)

        // Look for job cards or job listing elements
        const jobCards = document.querySelectorAll('[data-testid*="job"], .job-card, .job-item, [class*="job-"], a[href*="/offer/"], [class*="JobCard"], [class*="job-listing"]')

        if (jobCards.length > 0) {
            console.log('[Jobgether] Found ' + jobCards.length + ' job elements')
            break
        }

        if (attempts >= maxAttempts) {
            console.log('[Jobgether] Timeout - no job elements found')
            return JSON.stringify([])
        }

        await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // Look for job URLs that can be fetched
    const jobUrls = []
    const links = document.querySelectorAll('a[href*="/offer/"]')

    for (let link of links) {
        const href = link.href
        if (href && href.includes('/offer/') && !jobUrls.includes(href)) {
            jobUrls.push(href)
        }
    }

    console.log('[Jobgether] Found ' + jobUrls.length + ' job URLs to fetch')

    // Process each job URL with enhanced error handling
    const maxJobs = Math.min(jobUrls.length, 15) // Reduced limit
    for (let i = 0; i < maxJobs; i++) {
        const url = jobUrls[i]

        try {
            console.log('[Jobgether] Fetching job ' + (i + 1) + '/' + maxJobs + ': ' + url)

            // Enhanced delay with randomization
            await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000))

            const response = await fetch(url, {
                headers: {
                    'User-Agent': navigator.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'same-origin'
                },
                credentials: 'same-origin'
            })

            if (!response.ok) {
                console.log('[Jobgether] Failed to fetch ' + url + ': ' + response.status + ' ' + response.statusText)
                continue
            }

            const html = await response.text()
            const parser = new DOMParser()
            const doc = parser.parseFromString(html, 'text/html')

            // Extract job information from the job detail page
            const job = extractJobFromDetailPage(doc, url)
            if (job) {
                results.push(job)
                const salaryStr = job.salary ? '$' + job.salary + '/month' : 'No salary'
                console.log('✅ Successfully extracted: ' + job.title + ' at ' + job.company + ' - ' + salaryStr)
            }

        } catch (error) {
            console.log('[Jobgether] Error fetching job ' + url + ': ' + error.message)
        }
    }

    console.log('\\n=== JOBGETHER EXTRACTION COMPLETE ===')
    console.log('Successfully extracted ' + results.length + '/' + maxJobs + ' jobs')
    console.log('\\nExtracted jobs:')
    results.forEach((job, i) => {
        console.log((i+1) + '. ' + job.title + ' - ' + job.company + ' - $' + (job.salary || '0'))
    })

    console.log('\\n📋 Copy the JSON below and paste it into the parser:')
    console.log('=' + '='.repeat(60))

    const jsonResult = JSON.stringify(results, null, 2)
    console.log(jsonResult)

    console.log('=' + '='.repeat(60))
    console.log('✅ Script completed! Copy the JSON above ⬆️')

    // Try to copy to clipboard
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(jsonResult)
            console.log('📋 Data copied to clipboard!')
        } else {
            console.log('⚠️ Clipboard not available - please copy the JSON above manually')
        }
    } catch (error) {
        console.log('⚠️ Failed to copy to clipboard - please copy the JSON above manually')
    }

    // Try to download as file (like LinkedIn parser)
    try {
        const blob = new Blob([jsonResult], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'jobgether-jobs-' + new Date().toISOString().split('T')[0] + '.json'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        console.log('💾 File downloaded: ' + a.download)
    } catch (error) {
        console.log('⚠️ Could not download file: ' + error.message)
    }

    return jsonResult
}

function extractJobFromDetailPage(doc, url) {
    try {
        // Extract job ID from URL
        const jobIdMatch = url.match(/\\/offer\\/(\\d+|[a-f0-9-]+)/i)
        const itemId = jobIdMatch ? jobIdMatch[1] : null

        // First try to extract from JSON-LD structured data
        const jsonLdScripts = doc.querySelectorAll('script[type="application/ld+json"]')
        for (let script of jsonLdScripts) {
            try {
                const data = JSON.parse(script.textContent)
                if (data['@type'] === 'JobPosting') {
                    let salary = null
                    if (data.baseSalary && data.baseSalary.value) {
                        const salaryValue = data.baseSalary.value
                        const unitText = data.baseSalary.unitText || ''

                        if (typeof salaryValue === 'object' && salaryValue.minValue && salaryValue.maxValue) {
                            const min = parseFloat(salaryValue.minValue)
                            const max = parseFloat(salaryValue.maxValue)
                            const avgSalary = Math.round((min + max) / 2)

                            // Handle unit text to determine if it's yearly or monthly
                            if (unitText.toUpperCase().includes('YEAR') || unitText.toUpperCase().includes('ANNUAL')) {
                                salary = Math.round(avgSalary / 12) // Convert yearly to monthly
                            } else if (unitText.toUpperCase().includes('MONTH')) {
                                salary = avgSalary
                            } else {
                                // If no unit specified, use heuristics
                                if (avgSalary > 20000) {
                                    salary = Math.round(avgSalary / 12) // Likely yearly
                                } else {
                                    salary = avgSalary // Likely monthly
                                }
                            }
                        }
                    }

                    return {
                        parser: 'jobgether',
                        itemId,
                        title: data.title || 'No title',
                        company: data.hiringOrganization?.name || 'Unknown company',
                        description: data.description || '',
                        country: data.jobLocation?.[0]?.address?.addressCountry ||
                                data.jobLocation?.address?.addressCountry || 'Europe',
                        salary,
                        datePublish: data.datePosted ? data.datePosted.split('T')[0] : new Date().toISOString().split('T')[0],
                        href: url
                    }
                }
            } catch (e) {
                continue // Try next script
            }
        }

        // Fallback to HTML extraction - Look for job title - try multiple selectors
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

        // Improved company name extraction - avoid LinkedIn and generic terms
        let company = ''
        const companySelectors = [
            '[data-testid*="company"]:not([class*="linkedin"])',
            '.company-name:not([class*="linkedin"])',
            '[class*="company"]:not([class*="linkedin"])',
            'a[href*="/company/"]:not([href*="linkedin"])'
        ]

        for (let selector of companySelectors) {
            const companyEl = doc.querySelector(selector)
            if (companyEl && companyEl.textContent.trim()) {
                const companyText = companyEl.textContent.trim()
                // Filter out LinkedIn and generic text
                if (!companyText.toLowerCase().includes('linkedin') &&
                    !companyText.toLowerCase().includes('view company') &&
                    companyText.length > 1) {
                    company = companyText
                    break
                }
            }
        }

        // Try to find company in page title or metadata if not found
        if (!company) {
            const pageTitle = doc.querySelector('title')?.textContent || ''
            const companyMatch = pageTitle.match(/at ([A-Z][a-zA-Z\\s&]+?)(?:\\s-|$)/)
            if (companyMatch && !companyMatch[1].includes('LinkedIn')) {
                company = companyMatch[1].trim()
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

        // Enhanced salary extraction with validation
        const bodyText = doc.body ? doc.body.textContent : ''
        let salary = parseSalary(bodyText)

        // Validate salary - if it's unreasonably high, it's likely yearly
        if (salary && salary > 50000) {
            salary = Math.round(salary / 12)
        }
        // Filter out clearly wrong values like 175000000
        if (salary && (salary > 100000 || salary < 500)) {
            salary = null
        }

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
            console.log('[Jobgether] Skipping job - no title found')
            return null
        }

        return {
            parser: 'jobgether',
            itemId,
            title,
            company: company || 'Unknown company',
            country: location || 'Europe',
            salary,
            datePublish: new Date().toISOString().split('T')[0],
            description,
            href: url
        }

    } catch (error) {
        console.log('[Jobgether] Error extracting job: ' + error.message)
        return null
    }
}

function parseSalary(text) {
    if (!text) return null

    // Look for salary patterns in EUR and USD
    const salaryPatterns = [
        /€\\s*([\\d,]+(?:\\.\\d+)?)\\s*-\\s*€\\s*([\\d,]+(?:\\.\\d+)?)\\s*(?:per\\s+)?(?:month|monthly|mo)/i,
        /€\\s*([\\d,]+(?:\\.\\d+)?)\\s*-\\s*€\\s*([\\d,]+(?:\\.\\d+)?)\\s*(?:per\\s+)?(?:year|annually|yr)/i,
        /€\\s*([\\d,]+(?:\\.\\d+)?)\\s*-\\s*€\\s*([\\d,]+(?:\\.\\d+)?)/i,
        /€\\s*([\\d,]+(?:\\.\\d+)?)\\s*(?:per\\s+)?(?:month|monthly|mo)/i,
        /€\\s*([\\d,]+(?:\\.\\d+)?)\\s*(?:per\\s+)?(?:year|annually|yr)/i,
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

                // Handle monthly EUR salaries
                if (text.includes('month') || text.includes('monthly') || text.includes('mo')) {
                    return Math.round(avg)
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

                // Handle monthly EUR salaries
                if (text.includes('month') || text.includes('monthly') || text.includes('mo')) {
                    return Math.round(value)
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
scrapeJobgetherJobs()`

const parseSalary = (text) => {
    if (!text) return null

    // EUR and USD salary patterns
    const patterns = [
        /€\s*([\d,]+(?:\.\d+)?)\s*-\s*€\s*([\d,]+(?:\.\d+)?)\s*(?:per\s+)?(?:month|monthly|mo)/i,
        /€\s*([\d,]+(?:\.\d+)?)\s*-\s*€\s*([\d,]+(?:\.\d+)?)\s*(?:per\s+)?(?:year|annually|yr)/i,
        /€\s*([\d,]+(?:\.\d+)?)\s*-\s*€\s*([\d,]+(?:\.\d+)?)/i,
        /€\s*([\d,]+(?:\.\d+)?)\s*(?:per\s+)?(?:month|monthly|mo)/i,
        /€\s*([\d,]+(?:\.\d+)?)\s*(?:per\s+)?(?:year|annually|yr)/i,
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

                // Handle monthly EUR salaries
                if (text.includes('month') || text.includes('monthly') || text.includes('mo')) {
                    return Math.round(avg)
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

                // Handle monthly EUR salaries
                if (text.includes('month') || text.includes('monthly') || text.includes('mo')) {
                    return Math.round(value)
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
    // Jobgether uses /offer/ pattern
    const match = href.match(/\/offer\/([a-zA-Z0-9-]+)/i)
    return match ? match[1] : null
}

const extractJobsFromAstroIsland = (html) => {
    try {
        // Look for all astro-island components
        const astroRegex = /<astro-island[^>]*props="([^"]*)"[^>]*component-url="([^"]*)"[^>]*>/g
        let match
        const jobs = []

        while ((match = astroRegex.exec(html)) !== null) {
            try {
                const componentUrl = match[2]
                const propsText = match[1]

                // Only process components that might contain job data
                if (!componentUrl.includes('Match') && !componentUrl.includes('Job') && !componentUrl.includes('Offer')) {
                    continue
                }

                console.log(`[Jobgether] Processing component: ${componentUrl}`)

                // Decode HTML entities in props
                const decodedProps = propsText
                    .replace(/&quot;/g, '"')
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')

                const propsData = JSON.parse(decodedProps)

                // Look for different job data structures
                if (propsData.match && propsData.match[0] && propsData.match[0].offer) {
                    jobs.push(propsData.match[0])
                } else if (propsData.matches && Array.isArray(propsData.matches)) {
                    jobs.push(...propsData.matches)
                } else if (propsData.jobs && Array.isArray(propsData.jobs)) {
                    jobs.push(...propsData.jobs.map(job => ({ offer: job })))
                } else if (propsData.offers && Array.isArray(propsData.offers)) {
                    jobs.push(...propsData.offers.map(offer => ({ offer })))
                }

                // Check for individual job/offer data
                if (propsData.offer || propsData.job) {
                    jobs.push({ offer: propsData.offer || propsData.job })
                }

            } catch (e) {
                console.log('[Jobgether] Error parsing astro props:', e.message)
            }
        }

        console.log(`[Jobgether] Extracted ${jobs.length} jobs from astro islands`)
        return jobs
    } catch (error) {
        console.log('[Jobgether] Error extracting from astro islands:', error.message)
        return []
    }
}

const processAstroJobData = (matchData) => {
    try {
        const offer = matchData.offer || matchData

        if (!offer || !offer.title) {
            return null
        }

        // Extract salary with proper handling of Jobgether's encoded salary structure
        let salary = null
        if (offer.salary) {
            const salaryData = offer.salary

            // Handle array format [0, {currency: ..., min: ..., max: ...}]
            if (Array.isArray(salaryData) && salaryData.length > 1) {
                const salaryObj = salaryData[1]
                if (salaryObj && typeof salaryObj === 'object') {
                    const minSal = Array.isArray(salaryObj.min) ? salaryObj.min[1] : salaryObj.min
                    const maxSal = Array.isArray(salaryObj.max) ? salaryObj.max[1] : salaryObj.max

                    if (minSal && maxSal) {
                        salary = Math.round((minSal + maxSal) / 2)
                    } else if (minSal || maxSal) {
                        salary = minSal || maxSal
                    }
                }
            }
            // Handle direct object format
            else if (typeof salaryData === 'object' && (salaryData.min || salaryData.max)) {
                const minSal = Array.isArray(salaryData.min) ? salaryData.min[1] : salaryData.min
                const maxSal = Array.isArray(salaryData.max) ? salaryData.max[1] : salaryData.max

                if (minSal && maxSal) {
                    salary = Math.round((minSal + maxSal) / 2)
                } else if (minSal || maxSal) {
                    salary = minSal || maxSal
                }
            }

            // Convert yearly to monthly if salary is too high (likely yearly)
            if (salary && salary > 10000) {
                salary = Math.round(salary / 12)
            }
        }

        // Extract location with proper handling of encoded arrays
        let location = 'Europe'
        if (offer.countries && Array.isArray(offer.countries) && offer.countries.length > 0) {
            const country = offer.countries[0]
            if (Array.isArray(country) && country.length > 1) {
                location = country[1]?.name || country[1]
            } else if (country && typeof country === 'object') {
                location = country.name || 'Europe'
            }
        } else if (offer.continents && Array.isArray(offer.continents) && offer.continents.length > 0) {
            const continent = offer.continents[0]
            if (Array.isArray(continent) && continent.length > 1) {
                location = continent[1]?.name || continent[1]
            } else if (continent && typeof continent === 'object') {
                location = continent.name || 'Europe'
            }
        }

        // Extract company name with proper handling
        let company = ''
        if (offer.companyData) {
            if (Array.isArray(offer.companyData) && offer.companyData.length > 1) {
                company = offer.companyData[1]?.name || ''
            } else if (typeof offer.companyData === 'object') {
                company = offer.companyData.name || ''
            }
        }

        console.log(`[Jobgether] Processed astro job: ${offer.title}, salary: ${salary}, company: ${company}`)

        return {
            parser: name,
            itemId: offer._id || offer.id || null,
            title: offer.title || '',
            company,
            country: location,
            salary,
            datePublish: offer.createdAt ? offer.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
            description: offer.description || '',
            href: offer.slug ? `https://jobgether.com/offer/${offer.slug}` : `https://jobgether.com/offer/${offer._id}`
        }
    } catch (error) {
        console.log('[Jobgether] Error processing astro job data:', error.message)
        return null
    }
}

const extractJobFromCard = (card, index) => {
    try {
        // Look for href first as it's the most reliable indicator
        let linkEl = null
        let href = ''

        if (card.href && card.href.includes('/offer/')) {
            linkEl = card
            href = card.href
        } else {
            linkEl = card.querySelector('a[href*="/offer/"]')
            if (linkEl) {
                href = linkEl.href || linkEl.getAttribute('href')
            }
        }

        if (!href) {
            console.log(`[Jobgether] No offer href found in card ${index}`)
            return null
        }

        let fullHref = href
        if (href && !href.startsWith('http')) {
            fullHref = `https://jobgether.com${href}`
        }

        // Extract title from various sources
        let title = ''

        // Try multiple title selectors
        const titleSelectors = [
            'h1', 'h2', 'h3', 'h4',
            '.title', '[class*="title"]',
            '.job-title', '[class*="job-title"]',
            '.position', '[class*="position"]'
        ]

        for (const selector of titleSelectors) {
            const titleEl = card.querySelector(selector)
            if (titleEl && titleEl.textContent.trim()) {
                title = titleEl.textContent.trim()
                break
            }
        }

        // If no title found, try to extract from href
        if (!title && href) {
            // Extract from URLs like: /offer/6a14d4681afd2625c12dc8bb-full-stack-developer-nestjs-angular
            const urlMatch = href.match(/\/offer\/[a-zA-Z0-9]+-(.+)/)
            if (urlMatch) {
                title = urlMatch[1].replace(/[-_]/g, ' ')
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ')
            }
        }

        // Still no title? Use fallback
        if (!title) {
            title = `Job ${index + 1}`
        }

        // Look for company name
        const companySelectors = [
            '.company', '[class*="company"]',
            '.employer', '[class*="employer"]',
            '.organization', '[class*="organization"]'
        ]

        let company = ''
        for (const selector of companySelectors) {
            const companyEl = card.querySelector(selector)
            if (companyEl && companyEl.textContent.trim()) {
                company = companyEl.textContent.trim()
                break
            }
        }

        // Look for location
        const locationSelectors = [
            '.location', '[class*="location"]',
            '.place', '[class*="place"]',
            '.city', '[class*="city"]',
            '.country', '[class*="country"]'
        ]

        let location = ''
        for (const selector of locationSelectors) {
            const locationEl = card.querySelector(selector)
            if (locationEl && locationEl.textContent.trim()) {
                location = locationEl.textContent.trim()
                break
            }
        }

        // Extract salary from all text content
        const cardText = card.textContent || ''
        const salary = parseSalary(cardText)

        console.log(`[Jobgether] Extracted job from card ${index}: "${title}", company: "${company}"`)

        return {
            parser: name,
            itemId: extractJobId(href),
            title,
            company,
            country: location || 'Europe',
            salary,
            datePublish: new Date().toISOString().split('T')[0],
            description: '',
            href: fullHref
        }
    } catch (error) {
        console.log(`[Jobgether] Error extracting job from card ${index}:`, error.message)
        return null
    }
}

const parseJobFromHtml = async (html) => {
    const doc = htmlToDom(html)

    // First try to extract job from JSON-LD structured data (for individual job pages)
    try {
        const jsonLdScripts = doc.querySelectorAll('script[type="application/ld+json"]')

        for (let script of jsonLdScripts) {
            try {
                const data = JSON.parse(script.textContent)
                if (data['@type'] === 'JobPosting') {
                    const job = extractJobFromJsonLd(data, html)
                    if (job) {
                        console.log(`[Jobgether] Found job from JSON-LD: ${job.title}`)
                        return [job]
                    }
                }
            } catch (e) {
                continue // Try next script
            }
        }
    } catch (error) {
        console.log(`[Jobgether] Error extracting from JSON-LD: ${error.message}`)
    }

    // Try to extract jobs from astro-island components with job data (for listing pages)
    try {
        const jobData = extractJobsFromAstroIsland(html)
        if (jobData.length > 0) {
            console.log(`[Jobgether] Found ${jobData.length} jobs from astro-island data`)
            return jobData.map(job => processAstroJobData(job))
        }
    } catch (error) {
        console.log(`[Jobgether] Error extracting from astro-island: ${error.message}`)
    }

    // Check if we can extract job data from embedded content in listing page
    const potentialUrls = extractJobUrls(html)
    if (potentialUrls.length > 5) {
        console.log(`[Jobgether] Found ${potentialUrls.length} job URLs - extracting embedded data from listing page`)

        // Try to extract job data that might be embedded in the listing page
        const jobs = []

        // Look for job data in script tags or data attributes
        const jobDataPattern = /"offers?":\s*\[([^\]]+)\]/g
        const jobDataMatches = html.matchAll(jobDataPattern)

        for (const match of jobDataMatches) {
            try {
                const offersText = `[${match[1]}]`
                const offers = JSON.parse(offersText)

                for (const offer of offers) {
                    const processedJob = processAstroJobData({ offer })
                    if (processedJob) {
                        jobs.push(processedJob)
                    }
                }
            } catch (e) {
                continue
            }
        }

        if (jobs.length > 0) {
            console.log(`[Jobgether] Extracted ${jobs.length} jobs from embedded data`)
            return jobs
        }

        // Fallback: create jobs with instructions to use browser script
        console.log(`[Jobgether] Cannot extract embedded data, providing browser script instructions`)

        return potentialUrls.slice(0, 20).map((url, index) => {
            const urlMatch = url.match(/\/offer\/[a-zA-Z0-9]+-(.+)/)
            let title = `Job ${index + 1}`
            if (urlMatch) {
                title = urlMatch[1].replace(/[-_]/g, ' ')
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ')
            }

            return {
                parser: name,
                itemId: extractJobId(url),
                title,
                company: '',
                country: 'Europe',
                salary: null,
                datePublish: new Date().toISOString().split('T')[0],
                description: 'Use browser script below for full details including salary and company',
                href: url
            }
        })
    }

    // For pages with few URLs or single pages, extract from cards
    const jobs = []
    const jobCards = doc.querySelectorAll('[class*="job"], [data-testid*="job"], a[href*="/offer/"]')
    console.log(`[Jobgether] Found ${jobCards.length} potential job cards`)

    for (let i = 0; i < jobCards.length; i++) {
        const card = jobCards[i]
        try {
            const job = extractJobFromCard(card, i)
            if (job) {
                jobs.push(job)
                console.log(`[Jobgether] Job added from card: ${job.title}`)
            }
        } catch (error) {
            console.log(`[Jobgether] Error extracting job from card ${i}: ${error.message}`)
        }
    }

    // If no jobs found, try to extract current job URL from page
    if (jobs.length === 0) {
        const currentUrlMatch = html.match(/https:\/\/jobgether\.com\/offer\/([a-zA-Z0-9-]+)/)
        if (currentUrlMatch) {
            const fullUrl = currentUrlMatch[0]
            const urlMatch = fullUrl.match(/\/offer\/[a-zA-Z0-9]+-(.+)/)

            let title = 'Job'
            if (urlMatch) {
                title = urlMatch[1].replace(/[-_]/g, ' ')
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ')
            }

            console.log(`[Jobgether] Extracting single job from URL: ${fullUrl}`)

            return [{
                parser: name,
                itemId: extractJobId(fullUrl),
                title,
                company: extractCompanyFromPage(html) || 'Unknown',
                country: extractLocationFromPage(html) || 'Europe',
                salary: extractSalaryFromPage(html),
                datePublish: new Date().toISOString().split('T')[0],
                description: 'Use browser script for full details',
                href: fullUrl
            }]
        }
    }

    return jobs
}

const extractJobFromJsonLd = (data, html) => {
    try {
        let salary = null
        if (data.baseSalary && data.baseSalary.value) {
            const salaryValue = data.baseSalary.value
            const unitText = data.baseSalary.unitText || ''

            if (typeof salaryValue === 'object') {
                if (salaryValue.minValue !== undefined && salaryValue.maxValue !== undefined) {
                    const min = parseFloat(salaryValue.minValue)
                    const max = parseFloat(salaryValue.maxValue)
                    const avgSalary = Math.round((min + max) / 2)

                    // Handle unit text to determine if it's yearly or monthly
                    if (unitText.toUpperCase().includes('YEAR') || unitText.toUpperCase().includes('ANNUAL')) {
                        salary = Math.round(avgSalary / 12) // Convert yearly to monthly
                    } else if (unitText.toUpperCase().includes('MONTH')) {
                        salary = avgSalary
                    } else {
                        // If no unit specified, use heuristics based on amount
                        if (avgSalary > 20000) {
                            salary = Math.round(avgSalary / 12) // Likely yearly
                        } else {
                            salary = avgSalary // Likely monthly
                        }
                    }
                } else if (typeof salaryValue === 'number') {
                    const numSalary = parseFloat(salaryValue)
                    if (numSalary > 20000) {
                        salary = Math.round(numSalary / 12) // Likely yearly
                    } else {
                        salary = numSalary // Likely monthly
                    }
                }
            }
        }

        // Extract company name
        let company = ''
        if (data.hiringOrganization && data.hiringOrganization.name) {
            company = data.hiringOrganization.name
        }

        // Extract location
        let location = 'Europe'
        if (data.jobLocation && data.jobLocation.length > 0) {
            const jobLoc = data.jobLocation[0]
            if (jobLoc.address) {
                location = jobLoc.address.addressCountry ||
                          jobLoc.address.addressLocality ||
                          jobLoc.address.addressRegion ||
                          'Europe'
            }
        } else if (data.applicantLocationRequirements && data.applicantLocationRequirements.length > 0) {
            const req = data.applicantLocationRequirements[0]
            location = req.name || 'Europe'
        }

        // Map country codes to names
        const countryMap = {
            'ES': 'Spain',
            'FR': 'France',
            'DE': 'Germany',
            'IT': 'Italy',
            'NL': 'Netherlands',
            'BE': 'Belgium',
            'PT': 'Portugal',
            'GB': 'United Kingdom',
            'UK': 'United Kingdom'
        }

        if (countryMap[location]) {
            location = countryMap[location]
        }

        return {
            parser: name,
            itemId: extractJobId(data.identifier && data.identifier.value ? data.identifier.value : null),
            title: data.title || '',
            company,
            country: location,
            salary,
            datePublish: data.datePosted ? data.datePosted.split('T')[0] : new Date().toISOString().split('T')[0],
            description: data.description || '',
            href: html.match(/https:\/\/jobgether\.com\/offer\/[a-zA-Z0-9-]+/)?.[0] || ''
        }
    } catch (error) {
        console.log(`[Jobgether] Error parsing JSON-LD: ${error.message}`)
        return null
    }
}

const extractCompanyFromPage = (html) => {
    // Try multiple patterns to find company name
    const patterns = [
        /at ([A-Z][a-zA-Z\s&]+?)(?:\s*<\/title>)/,
        /"hiringOrganization"[^}]*"name":\s*"([^"]+)"/,
        /company[^>]*>([^<]+)</i
    ]

    for (const pattern of patterns) {
        const match = html.match(pattern)
        if (match && match[1].trim()) {
            return match[1].trim()
        }
    }
    return null
}

const extractLocationFromPage = (html) => {
    // Try to find location in structured data or meta tags
    const patterns = [
        /"addressCountry":\s*"([^"]+)"/,
        /"applicantLocationRequirements"[^}]*"name":\s*"([^"]+)"/,
        /This a Full Remote job, the offer is available from:\s*([A-Za-z\s]+)/
    ]

    for (const pattern of patterns) {
        const match = html.match(pattern)
        if (match && match[1].trim()) {
            let location = match[1].trim()

            // Map country codes to names
            const countryMap = {
                'ES': 'Spain',
                'FR': 'France',
                'DE': 'Germany',
                'IT': 'Italy',
                'NL': 'Netherlands',
                'BE': 'Belgium',
                'PT': 'Portugal',
                'GB': 'United Kingdom',
                'UK': 'United Kingdom'
            }

            return countryMap[location] || location
        }
    }
    return null
}

const extractSalaryFromPage = (html) => {
    // Try to find salary in structured data
    const salaryMatch = html.match(/"baseSalary"[^}]*"minValue":(\d+)[^}]*"maxValue":(\d+)[^}]*"unitText":"([^"]+)"/)

    if (salaryMatch) {
        const min = parseInt(salaryMatch[1])
        const max = parseInt(salaryMatch[2])
        const unit = salaryMatch[3]

        let salary = Math.round((min + max) / 2)

        // Convert yearly to monthly
        if (unit === 'YEAR' && salary > 10000) {
            salary = Math.round(salary / 12)
        }

        return salary
    }

    // Fallback to text-based parsing
    return parseSalary(html)
}

const extractJobsFromListingHTML = (html, jobUrls) => {
    console.log(`[Jobgether] Extracting job data from listing HTML for ${jobUrls.length} jobs`)

    const jobs = []

    // Try to find salary data patterns in the HTML
    const salaryPatterns = [
        /"salary":\s*\[0,\s*\{[^}]*"min":\s*\[0,\s*(\d+)\][^}]*"max":\s*\[0,\s*(\d+)\]/g,
        /"salary":\s*\{[^}]*"minValue":\s*(\d+)[^}]*"maxValue":\s*(\d+)/g
    ]

    // Try to find company data
    const companyPattern = /"companyData":\s*\[1,\s*\[\[0,\s*\{[^}]*"name":\s*\[0,\s*"([^"]+)"/g

    const salaryMatches = []
    const companyMatches = []

    // Collect all salary matches
    for (const pattern of salaryPatterns) {
        let match
        while ((match = pattern.exec(html)) !== null) {
            salaryMatches.push({
                min: parseInt(match[1]),
                max: parseInt(match[2])
            })
        }
    }

    // Collect all company matches
    let companyMatch
    while ((companyMatch = companyPattern.exec(html)) !== null) {
        companyMatches.push(companyMatch[1])
    }

    console.log(`[Jobgether] Found ${salaryMatches.length} salary entries, ${companyMatches.length} company entries`)

    // Create jobs from URLs and try to match with extracted data
    for (let i = 0; i < Math.min(jobUrls.length, 20); i++) {
        const url = jobUrls[i]
        const urlMatch = url.match(/\/offer\/[a-zA-Z0-9]+-(.+)/)

        let title = `Job ${i + 1}`
        if (urlMatch) {
            title = urlMatch[1].replace(/[-_]/g, ' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
        }

        // Try to match salary data
        let salary = null
        if (salaryMatches[i]) {
            const salaryData = salaryMatches[i]
            salary = Math.round((salaryData.min + salaryData.max) / 2)
            // Convert yearly to monthly if too high
            if (salary > 10000) {
                salary = Math.round(salary / 12)
            }
        }

        // Try to match company data
        const company = companyMatches[i] || ''

        const job = {
            parser: name,
            itemId: extractJobId(url),
            title,
            company,
            country: 'Europe',
            salary,
            datePublish: new Date().toISOString().split('T')[0],
            description: `Job details extracted from listing page. Full URL: ${url}`,
            href: url
        }

        jobs.push(job)
    }

    console.log(`[Jobgether] Created ${jobs.length} jobs from listing HTML`)
    return jobs
}

const extractJobDetailsFromPage = (doc, url, itemId) => {
    try {
        // Try to find structured data first
        const jsonLdScripts = doc.querySelectorAll('script[type="application/ld+json"]')

        for (let script of jsonLdScripts) {
            try {
                const data = JSON.parse(script.textContent)
                if (data['@type'] === 'JobPosting') {
                    let salary = null
                    if (data.baseSalary && data.baseSalary.value) {
                        const salaryValue = data.baseSalary.value
                        if (typeof salaryValue === 'object' && salaryValue.minValue && salaryValue.maxValue) {
                            salary = Math.round((salaryValue.minValue + salaryValue.maxValue) / 2)
                        } else if (typeof salaryValue === 'number') {
                            salary = salaryValue
                        }
                    }

                    return {
                        parser: name,
                        itemId,
                        title: data.title || '',
                        company: data.hiringOrganization?.name || '',
                        country: data.jobLocation?.address?.addressCountry || data.jobLocation?.address?.addressLocality || 'Europe',
                        salary,
                        datePublish: data.datePosted ? data.datePosted.split('T')[0] : new Date().toISOString().split('T')[0],
                        description: data.description || '',
                        href: url
                    }
                }
            } catch (e) {
                // Continue to next script if JSON parsing fails
                continue
            }
        }

        // Fallback to HTML parsing
        let title = ''
        const titleSelectors = [
            'h1[class*="title"]',
            'h1[class*="job"]',
            '.job-title',
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

        // Company name
        let company = ''
        const companySelectors = [
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

        // Location
        let location = ''
        const locationSelectors = [
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

        // Description
        let description = ''
        const descSelectors = [
            '.job-description',
            '[class*="description"]',
            '[class*="job-detail"]',
            'main'
        ]

        for (let selector of descSelectors) {
            const descEl = doc.querySelector(selector)
            if (descEl && descEl.innerHTML) {
                description = descEl.innerHTML.trim()
                break
            }
        }

        // Extract salary from page text
        const bodyText = doc.body ? doc.body.textContent : ''
        const salary = parseSalary(bodyText)

        if (!title) {
            console.log(`[Jobgether] Skipping job - no title found for ${itemId}`)
            return null
        }

        return {
            parser: name,
            itemId,
            title,
            company,
            country: location || 'Europe',
            salary,
            datePublish: new Date().toISOString().split('T')[0],
            description,
            href: url
        }

    } catch (error) {
        console.log(`[Jobgether] Error extracting job details: ${error.message}`)
        return null
    }
}

export const parse = async (data) => {
    console.log('[Jobgether] Starting parse...')

    if (typeof data === 'string') {
        const trimmed = data.trim()

        // Check if it's JSON array
        if (trimmed.startsWith('[')) {
            try {
                const jobsArray = JSON.parse(trimmed)
                console.log('[Jobgether] Parsed JSON array with', jobsArray.length, 'items')
                return processJobsArray(jobsArray)
            } catch (e) {
                console.error('[Jobgether] Failed to parse JSON:', e)
                return []
            }
        }

        // Check if it's HTML
        if (trimmed.includes('<html') || trimmed.includes('<!DOCTYPE') || trimmed.includes('jobgether')) {
            console.log('[Jobgether] Processing HTML page...')

            try {
                // First try to get jobs from HTML directly (for single job pages)
                const jobs = await parseJobFromHtml(trimmed)

                // If we found jobs, return them
                if (jobs.length > 0) {
                    console.log(`[Jobgether] Found ${jobs.length} jobs from direct HTML parsing`)
                    return jobs
                }

                // If no jobs found, try to extract URLs and simulate detail fetching
                console.log('[Jobgether] No direct jobs found, checking for job URLs...')
                const jobUrls = extractJobUrls(trimmed)

                if (jobUrls.length > 0) {
                    console.log(`[Jobgether] Found ${jobUrls.length} job URLs, but cannot fetch details in parse mode`)
                    console.log('[Jobgether] Please use URL input instead of HTML for full job details')

                    // Return basic jobs from URLs for now
                    return jobUrls.slice(0, 20).map((url, index) => {
                        const urlMatch = url.match(/\/offer\/[a-zA-Z0-9]+-(.+)/)
                        let title = `Job ${index + 1}`
                        if (urlMatch) {
                            title = urlMatch[1].replace(/[-_]/g, ' ')
                                .split(' ')
                                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                .join(' ')
                        }

                        return {
                            parser: name,
                            itemId: extractJobId(url),
                            title,
                            company: '',
                            country: 'Europe',
                            salary: null,
                            datePublish: new Date().toISOString().split('T')[0],
                            description: 'For full details, paste job listing URL instead of HTML',
                            href: url
                        }
                    })
                }

                console.log('[Jobgether] No job data found in HTML. This appears to be a Single Page Application.')
                console.log('[Jobgether] Please use the browser script instead:')
                console.log('[Jobgether] 1. Go to Jobgether job matches page')
                console.log('[Jobgether] 2. Open browser console (F12)')
                console.log('[Jobgether] 3. Copy and paste the script shown below the textarea')
                console.log('[Jobgether] 4. Run the script and paste the JSON result here')
                return []

            } catch (error) {
                console.error('[Jobgether] Error processing HTML:', error)
                return []
            }
        }

        console.error('[Jobgether] Unknown data format')
        return []
    } else if (Array.isArray(data)) {
        return processJobsArray(data)
    }

    return []
}

const processJobsArray = (jobsArray) => {
    const jobs = []

    for (let i = 0; i < jobsArray.length; i++) {
        console.log(`[Jobgether] Processing item ${i + 1}/${jobsArray.length}`)
        try {
            const jobData = jobsArray[i]

            if (!jobData || typeof jobData !== 'object') {
                console.log('[Jobgether] Skipped - invalid job data')
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
                console.log('[Jobgether] Skipped - no title')
                continue
            }

            const job = {
                parser: name,
                itemId: itemId || null,
                title: title.trim(),
                company: company ? company.trim() : '',
                country: country ? country.trim() : 'Europe',
                salary,
                datePublish: datePublish || new Date().toISOString().split('T')[0],
                description: description || '',
                href: href || '',
            }

            jobs.push(job)
            console.log('[Jobgether] Job added:', job.title)
        } catch (e) {
            console.error('[Jobgether] Failed to parse item', i, e)
        }
    }

    console.log('[Jobgether] Parse complete. Total jobs:', jobs.length)
    return jobs
}

export const validate = (data) => {
    if (typeof data !== 'string') return false
    return data.includes('jobgether') ||
           data.includes('jobgether.com') ||
           data.includes('Jobgether')
}

export const extractJobUrls = (html) => {
    console.log('[Jobgether] Extracting job URLs from listing page...')

    try {
        const urls = new Set()

        // Pattern for Jobgether job URLs
        const urlRegex = /href="(\/offer\/[a-zA-Z0-9-]+[^"]*?)"/g
        let match

        while ((match = urlRegex.exec(html)) !== null) {
            let url = match[1]

            // Clean up URL (remove any fragments or query params for deduplication)
            url = url.split('#')[0].split('?')[0]

            // Convert to full URL
            const fullUrl = url.startsWith('http') ? url : `https://jobgether.com${url}`
            urls.add(fullUrl)
        }

        const urlArray = Array.from(urls)
        console.log(`[Jobgether] Found ${urlArray.length} unique job URLs`)

        return urlArray
    } catch (error) {
        console.error('[Jobgether] Error extracting job URLs:', error)
        return []
    }
}

export const parseDetail = (html, url) => {
    console.log(`[Jobgether] Parsing detail page: ${url}`)

    try {
        const doc = htmlToDom(html)

        // Try JSON-LD first (most reliable for individual pages)
        const jsonLdScripts = doc.querySelectorAll('script[type="application/ld+json"]')

        for (let script of jsonLdScripts) {
            try {
                const data = JSON.parse(script.textContent)
                if (data['@type'] === 'JobPosting') {
                    const job = extractJobFromJsonLd(data, html)
                    if (job) {
                        job.href = url  // Ensure correct URL
                        console.log(`[Jobgether] Extracted job from JSON-LD: ${job.title}`)
                        return job
                    }
                }
            } catch (e) {
                continue
            }
        }

        // Fallback: extract from page content
        const itemId = extractJobId(url)
        const job = extractJobDetailsFromPage(doc, url, itemId)

        if (job) {
            console.log(`[Jobgether] Extracted job from page content: ${job.title}`)
            return job
        }

        // Last resort: extract from URL
        const urlMatch = url.match(/\/offer\/[a-zA-Z0-9]+-(.+)/)
        let title = 'Job'
        if (urlMatch) {
            title = urlMatch[1].replace(/[-_]/g, ' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
        }

        console.log(`[Jobgether] Using URL-based extraction for: ${title}`)

        return {
            parser: name,
            itemId,
            title,
            company: extractCompanyFromPage(html) || '',
            country: extractLocationFromPage(html) || 'Europe',
            salary: extractSalaryFromPage(html),
            datePublish: new Date().toISOString().split('T')[0],
            description: '',
            href: url
        }

    } catch (error) {
        console.error(`[Jobgether] Error parsing detail page ${url}:`, error)
        return null
    }
}

export const supportsDetailPages = true

export default {
    name,
    label,
    parse,
    validate,
    browserScript,
    extractJobUrls,
    parseDetail,
    supportsDetailPages,
}