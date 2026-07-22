export const name = 'djinni'
export const label = 'Djinni.co'

const htmlToDom = (html) => {
    const parser = new DOMParser()
    return parser.parseFromString(html, 'text/html')
}

const getText = (el, selector) => {
    const node = el.querySelector(selector)
    return node ? node.textContent.trim() : ''
}

const getHtml = (el, selector) => {
    const node = el.querySelector(selector)
    return node ? node.innerHTML.trim() : ''
}

const parseSalary = (salaryStr) => {
    if (!salaryStr) return null

    const dollarCount = (salaryStr.match(/\$/g) || []).length

    switch (dollarCount) {
        case 1: return 1500
        case 2: return 2500
        case 3: return 4000
        case 4: return 6000
        default: return null
    }
}

const parseDate = (vacancy) => {
    const timeEl = vacancy.querySelector('[title*="."][data-toggle="tooltip"]')
    if (timeEl) {
        const title = timeEl.getAttribute('title')
        const match = title.match(/(\d{1,2})\.(\d{2})\.(\d{4})/)
        if (match) {
            const day = match[1].padStart(2, '0')
            const month = match[2]
            const year = match[3]
            return `${year}-${month}-${day}`
        }
    }

    const relativeEl = vacancy.querySelector('.text-nowrap[title]')
    if (relativeEl) {
        const text = relativeEl.textContent.trim()
        return parseRelativeDate(text)
    }

    return null
}

const parseRelativeDate = (text) => {
    const now = new Date()

    const match = text.match(/(\d+)\s*(h|d|w|m)/i)
    if (match) {
        const num = parseInt(match[1], 10)
        const unit = match[2].toLowerCase()

        switch (unit) {
            case 'h':
                now.setHours(now.getHours() - num)
                break
            case 'd':
                now.setDate(now.getDate() - num)
                break
            case 'w':
                now.setDate(now.getDate() - num * 7)
                break
            case 'm':
                now.setMonth(now.getMonth() - num)
                break
        }

        return now.toISOString().split('T')[0]
    }

    return null
}

// Real dollar figures as shown on a job's detail page, e.g. "$1800-2200" or "$1800".
// (Djinni only shows $ tier icons on the list page — actual numbers require opening the job.)
const parseSalaryAmount = (text) => {
    if (!text) return null

    const rangeMatch = text.match(/\$\s*([\d\s]+)\s*[–\-]\s*\$?\s*([\d\s]+)/)
    if (rangeMatch) {
        const min = parseInt(rangeMatch[1].replace(/\s/g, ''), 10)
        const max = parseInt(rangeMatch[2].replace(/\s/g, ''), 10)
        return Math.round((min + max) / 2)
    }

    const singleMatch = text.match(/\$\s*([\d\s]+)/)
    if (singleMatch) {
        return parseInt(singleMatch[1].replace(/\s/g, ''), 10)
    }

    return null
}

const months = {
    january: '01', february: '02', march: '03', april: '04',
    may: '05', june: '06', july: '07', august: '08',
    september: '09', october: '10', november: '11', december: '12',
}

const parsePublishedDate = (text) => {
    if (!text) return null

    const match = text.match(/(\d{1,2})\s+([A-Za-z]+)(?:\s+(\d{4}))?/)
    if (!match) return null

    const day = match[1].padStart(2, '0')
    const month = months[match[2].toLowerCase()]
    if (!month) return null

    const year = match[3] || new Date().getFullYear().toString()
    return `${year}-${month}-${day}`
}

const extractJobId = (href) => {
    if (!href) return null
    const match = href.match(/\/jobs\/(\d+)-/)
    return match ? match[1] : null
}

export const extractJobUrls = (html) => {
    const doc = htmlToDom(html)
    const urls = []

    doc.querySelectorAll('a[href*="/jobs/"]').forEach(link => {
        const href = link.getAttribute('href')
        if (href && /\/jobs\/\d+-/.test(href)) {
            const fullUrl = href.startsWith('http') ? href : `https://djinni.co${href}`
            if (!urls.includes(fullUrl)) {
                urls.push(fullUrl)
            }
        }
    })

    console.log('[Djinni] Extracted', urls.length, 'job URLs')
    return urls
}

export const parseDetail = (html, url) => {
    console.log('[Djinni] Parsing detail page:', url)

    const doc = htmlToDom(html)

    const title = getText(doc, 'h1')

    // The company logo link (class="picture", wraps only an <img>) also matches
    // this href pattern and comes first in document order, so pick the first
    // match that actually has text — that's the company name link.
    let company = ''
    for (const el of doc.querySelectorAll('a[href*="/jobs/company-"]')) {
        const text = el.textContent.trim()
        if (text) {
            company = text
            break
        }
    }

    const country = getText(doc, '.location-text') || 'Ukraine'

    const salaryText = getText(doc, '.fs-3.fw-bold') || getText(doc, 'strong.font-weight-600')
    const salary = parseSalaryAmount(salaryText)

    const description = getHtml(doc, '.job-post__description')

    const publishedText = getText(doc, '#job-publication-info .font-weight-500')
    const datePublish = parsePublishedDate(publishedText)

    const itemId = extractJobId(url)

    return {
        parser: name,
        itemId,
        title,
        company,
        country,
        salary,
        datePublish,
        description,
        href: url,
    }
}

export const parse = (data) => {
    console.log('[Djinni] Starting parse...')

    const doc = typeof data === 'string' ? htmlToDom(data) : data
    const jobs = []

    const selectors = [
        '.job-item',
        '[id^="job-item-"]',
        '[class*="job-item"]',
        '.list-jobs__item',
        '.jobs-list__item',
    ]

    let vacancies = []
    for (const selector of selectors) {
        const found = doc.querySelectorAll(selector)
        console.log(`[Djinni] Selector "${selector}" found:`, found.length)
        if (found.length > 0 && vacancies.length === 0) {
            vacancies = found
        }
    }

    console.log('[Djinni] Total vacancies to parse:', vacancies.length)

    vacancies.forEach((vacancy, index) => {
        try {
            const itemIdMatch = vacancy.id?.match(/job-item-(\d+)/)
            const itemId = itemIdMatch ? itemIdMatch[1] : null

            const titleEl = vacancy.querySelector('.job-item__position a, h2 a, a[href*="/jobs/"]')
            const title = titleEl ? titleEl.textContent.trim() : getText(vacancy, '.job-item__position, h2')
            const hrefRaw = titleEl?.getAttribute('href') || ''
            const href = hrefRaw ? (hrefRaw.startsWith('http') ? hrefRaw : `https://djinni.co${hrefRaw}`) : null

            const company = getText(vacancy, '.text-gray-800, .font-weight-500')
            const country = getText(vacancy, '.location-text') || 'Ukraine'

            const salaryEl = vacancy.querySelector('[data-toggle="tooltip"][title*="Salary"]')
            const salaryStr = salaryEl ? salaryEl.textContent.trim() : ''
            const salary = parseSalary(salaryStr)

            const description = getHtml(vacancy, '.js-original-text') ||
                               getHtml(vacancy, '.description-expandable')

            const datePublish = parseDate(vacancy)

            if (title) {
                jobs.push({
                    parser: name,
                    itemId,
                    title,
                    company,
                    country,
                    salary,
                    datePublish,
                    description,
                    href,
                })
            }
        } catch (e) {
            console.warn('[Djinni] Failed to parse vacancy', e)
        }
    })

    console.log('[Djinni] Parse complete. Total jobs:', jobs.length)
    return jobs
}

export const validate = (data) => {
    if (typeof data !== 'string') return false
    return data.includes('djinni') ||
           data.includes('job-item') ||
           data.includes('job-item__position')
}

// Note: intentionally no `autoFetchDetails` flag here — extractJobUrls/parseDetail
// exist for the batch multi-URL feature, but the existing URL/HTML-paste modes
// keep their current fast list-only parsing behavior unchanged.
export default {
    name,
    label,
    parse,
    validate,
    extractJobUrls,
    parseDetail,
}
