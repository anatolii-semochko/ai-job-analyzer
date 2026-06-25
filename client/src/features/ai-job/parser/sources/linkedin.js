export const name = 'linkedin'
export const label = 'LinkedIn'

const htmlToDom = (html) => {
    const parser = new DOMParser()
    return parser.parseFromString(html, 'text/html')
}

const getText = (el, selector) => {
    const node = el.querySelector(selector)
    return node ? node.textContent.trim().replace(/\s+/g, ' ') : ''
}

const parseSalary = (text) => {
    if (!text) return null

    const rangeWithPeriodMatch = text.match(/\$\s*([\d,]+(?:\.\d+)?)\s*-\s*\$\s*([\d,]+(?:\.\d+)?)\s*(?:\/\s*)?(per\s+)?(hr|hour|mo|month|yr|year|annually|annum|week|wk|day)/i)
    if (rangeWithPeriodMatch) {
        const min = parseFloat(rangeWithPeriodMatch[1].replace(/,/g, ''))
        const max = parseFloat(rangeWithPeriodMatch[2].replace(/,/g, ''))
        const avg = (min + max) / 2
        const period = rangeWithPeriodMatch[4]?.toLowerCase() || ''
        return convertToMonthly(avg, period)
    }

    const rangeMatch = text.match(/\$\s*([\d,]+(?:\.\d+)?)\s*-\s*\$\s*([\d,]+(?:\.\d+)?)(?!\s*\/|\s*per)/i)
    if (rangeMatch) {
        const min = parseFloat(rangeMatch[1].replace(/,/g, ''))
        const max = parseFloat(rangeMatch[2].replace(/,/g, ''))
        const avg = (min + max) / 2
        return convertToMonthly(avg, '')
    }

    const singleWithPeriodMatch = text.match(/\$\s*([\d,]+(?:\.\d+)?)\s*(?:\/\s*)?(per\s+)?(hr|hour|mo|month|yr|year|annually|annum|week|wk|day)/i)
    if (singleWithPeriodMatch) {
        const value = parseFloat(singleWithPeriodMatch[1].replace(/,/g, ''))
        const period = singleWithPeriodMatch[3]?.toLowerCase() || ''
        return convertToMonthly(value, period)
    }

    const singleMatch = text.match(/\$\s*([\d,]+(?:\.\d+)?)(?!\s*\/|\s*per|-)/i)
    if (singleMatch) {
        const value = parseFloat(singleMatch[1].replace(/,/g, ''))
        if (value < 10) return null
        return convertToMonthly(value, '')
    }

    return null
}

const convertToMonthly = (value, period) => {
    const p = period.toLowerCase()

    if (p.includes('yr') || p.includes('year') || p.includes('annual') || p.includes('annum')) {
        return Math.round(value / 12)
    }
    if (p.includes('mo') || p.includes('month')) {
        return Math.round(value)
    }
    if (p.includes('hr') || p.includes('hour')) {
        return Math.round(value * 160)
    }
    if (p.includes('week') || p.includes('wk')) {
        return Math.round(value * 4.33)
    }
    if (p.includes('day')) {
        return Math.round(value * 22)
    }

    if (value >= 10 && value <= 500) {
        return Math.round(value * 160)
    }
    if (value > 20000) {
        return Math.round(value / 12)
    }
    return Math.round(value)
}

const parseDate = (text) => {
    if (!text) return null

    const now = new Date()

    const match = text.match(/(\d+)\s*(hour|day|week|month)s?\s*ago/i)
    if (match) {
        const num = parseInt(match[1], 10)
        const unit = match[2].toLowerCase()

        switch (unit) {
            case 'hour':
                now.setHours(now.getHours() - num)
                break
            case 'day':
                now.setDate(now.getDate() - num)
                break
            case 'week':
                now.setDate(now.getDate() - num * 7)
                break
            case 'month':
                now.setMonth(now.getMonth() - num)
                break
        }

        return now.toISOString().split('T')[0]
    }

    return null
}

const extractJobId = (href) => {
    if (!href) return null
    const match = href.match(/\/jobs\/view\/(\d+)/)
    return match ? match[1] : null
}

const parseJobDetail = (html) => {
    const doc = htmlToDom(html)
    const root = doc.body

    console.log('[LinkedIn] Parsing job detail...')

    // Try multiple selectors for title
    const titleSelectors = [
        'h1.t-24 a',
        'h1 a[href*="/jobs/view/"]',
        '.job-details-jobs-unified-top-card__job-title a',
        '.job-details-jobs-unified-top-card__job-title',
        '.jobs-unified-top-card__job-title a',
        '.jobs-unified-top-card__job-title',
        'h1[data-test="job-title"]',
        '.job-view-layout h1'
    ];

    let titleEl = null;
    for (const selector of titleSelectors) {
        titleEl = root.querySelector(selector);
        if (titleEl) break;
    }

    const title = titleEl ? titleEl.textContent.trim() : ''
    console.log('[LinkedIn] Title:', title)

    const href = titleEl?.getAttribute('href') || titleEl?.closest('a')?.getAttribute('href') || ''
    const fullHref = href.startsWith('http') ? href : (href ? `https://www.linkedin.com${href}` : null)
    const itemId = extractJobId(href)

    // Try multiple selectors for company
    const companySelectors = [
        '.job-details-jobs-unified-top-card__company-name a',
        '.job-details-jobs-unified-top-card__company-name',
        '.jobs-unified-top-card__company-name a',
        '.jobs-unified-top-card__company-name',
        '[data-test="job-company-name"]'
    ];

    let company = '';
    for (const selector of companySelectors) {
        company = getText(root, selector);
        if (company) break;
    }

    // Try multiple selectors for tertiary description (location, date, etc.)
    const tertiarySelectors = [
        '.job-details-jobs-unified-top-card__tertiary-description-container',
        '.jobs-unified-top-card__tertiary-description',
        '.job-details-top-card__tertiary-description'
    ];

    let tertiaryText = '';
    for (const selector of tertiarySelectors) {
        tertiaryText = getText(root, selector);
        if (tertiaryText) break;
    }

    const locationMatch = tertiaryText.match(/^([^·]+)/)
    const country = locationMatch ? locationMatch[1].trim() : ''

    const datePublish = parseDate(tertiaryText)

    // Try multiple selectors for description
    const descriptionSelectors = [
        '#job-details .mt4',
        '.jobs-description-content__text',
        '.job-details-jobs-unified-top-card .jobs-description',
        '.jobs-description__text',
        '.job-view-layout .jobs-description'
    ];

    let descriptionEl = null;
    for (const selector of descriptionSelectors) {
        descriptionEl = root.querySelector(selector);
        if (descriptionEl) break;
    }

    let description = descriptionEl ? descriptionEl.innerHTML.trim() : ''
    description = description.replace(/<!--.*?-->/g, '')

    const fullText = root.textContent || ''
    const salary = parseSalary(fullText)

    if (!title) {
        console.log('[LinkedIn] Skipped - no title')
        return null
    }

    return {
        parser: name,
        itemId,
        title,
        company,
        country,
        salary,
        datePublish,
        description,
        href: fullHref,
    }
}

export const parse = (data) => {
    console.log('[LinkedIn] Starting parse...')

    let jobsArray = []

    if (typeof data === 'string') {
        const trimmed = data.trim()
        if (trimmed.startsWith('[')) {
            try {
                jobsArray = JSON.parse(trimmed)
                console.log('[LinkedIn] Parsed JSON array with', jobsArray.length, 'items')
            } catch (e) {
                console.error('[LinkedIn] Failed to parse JSON:', e)
                return []
            }
        } else {
            return []
        }
    } else if (Array.isArray(data)) {
        jobsArray = data
    }

    const jobs = []

    for (let i = 0; i < jobsArray.length; i++) {
        console.log(`[LinkedIn] Processing item ${i + 1}/${jobsArray.length}`)
        try {
            const jobData = jobsArray[i]

            if (!jobData || typeof jobData !== 'object') {
                console.log('[LinkedIn] Skipping invalid job data')
                continue
            }

            // Виправляємо location якщо це title
            let location = jobData.location
            if (!location || location === jobData.title || location.includes('Engineer') || location.includes('Developer')) {
                // Шукаємо в description
                const descLocationMatch = jobData.description?.match(/<strong>Location:\s*<\/strong>([^<]+)/i)
                if (descLocationMatch) {
                    location = descLocationMatch[1].trim()
                } else {
                    location = 'Remote' // default fallback
                }
            }

            // // Витягаємо salary з description якщо null або невалідне
            // let salary = jobData.salary
            // if (!salary || typeof salary !== 'number') {
            //     salary = parseSalary(jobData.description || '')
            // }

            const job = {
                parser: name,
                itemId: jobData.jobId || null,
                title: jobData.title || '',
                company: jobData.company || '',
                country: location || '',
                salary: jobData.salary,
                datePublish: null,
                description: jobData.description || '',
                href: jobData.url || '',
                isDeactivated: jobData.isDeactivated || false
            }

            if (job.title) {
                jobs.push(job)
                console.log('[LinkedIn] Job added:', job.title)
            }
        } catch (e) {
            console.error('[LinkedIn] Failed to parse item', i, e)
        }
    }

    console.log('[LinkedIn] Parse complete. Total jobs:', jobs.length)
    return jobs
}

export const validate = (data) => {
    if (typeof data !== 'string') return false

    // Перевіряємо чи це новий формат JSON
    const trimmed = data.trim()
    if (trimmed.startsWith('[')) {
        try {
            const parsed = JSON.parse(trimmed)
            if (Array.isArray(parsed) && parsed.length > 0) {
                // Перевіряємо перший елемент на наявність полів LinkedIn job
                const first = parsed[0]
                return first &&
                       typeof first === 'object' &&
                       (first.jobId || first.url?.includes('linkedin.com/jobs/view/') ||
                        first.title || first.company)
            }
        } catch (e) {
            // Якщо не парситься як JSON, перевіряємо старий формат
        }
    }

    // Старий формат (HTML)
    return data.includes('linkedin') ||
           data.includes('job-details') ||
           data.includes('jobs-unified-top-card') ||
           data.includes('job-details-jobs-unified-top-card') ||
           data.includes('jobs-search-results') ||
           data.includes('/jobs/view/')
}

export default {
    name,
    label,
    parse,
    validate,
}
