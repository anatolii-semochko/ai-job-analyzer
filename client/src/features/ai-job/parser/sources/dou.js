export const name = 'dou'
export const label = 'DOU.ua'

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

    const rangeMatch = text.match(/\$\s*([\d\s]+)\s*[–\-]\s*\$?\s*([\d\s]+)/i)
    if (rangeMatch) {
        const min = parseInt(rangeMatch[1].replace(/\s/g, ''), 10)
        const max = parseInt(rangeMatch[2].replace(/\s/g, ''), 10)
        return Math.round((min + max) / 2)
    }

    const singleMatch = text.match(/\$\s*([\d\s]+)/i)
    if (singleMatch) {
        return parseInt(singleMatch[1].replace(/\s/g, ''), 10)
    }

    return null
}

const parseDate = (dateStr) => {
    if (!dateStr) return null

    const months = {
        'січня': '01', 'лютого': '02', 'березня': '03', 'квітня': '04',
        'травня': '05', 'червня': '06', 'липня': '07', 'серпня': '08',
        'вересня': '09', 'жовтня': '10', 'листопада': '11', 'грудня': '12'
    }

    const match = dateStr.match(/(\d{1,2})\s+(\S+)(?:\s+(\d{4}))?/)
    if (match) {
        const day = match[1].padStart(2, '0')
        const monthName = match[2].toLowerCase()
        const month = months[monthName]
        if (!month) return null

        const year = match[3] || new Date().getFullYear().toString()
        return `${year}-${month}-${day}`
    }

    return null
}

const extractJobId = (href) => {
    if (!href) return null
    const match = href.match(/\/vacancies\/(\d+)/)
    return match ? match[1] : null
}

const parseListPage = (doc) => {
    const jobs = []
    const vacancies = doc.querySelectorAll('li.l-vacancy')

    console.log('[DOU] Found vacancies in list:', vacancies.length)

    vacancies.forEach((vacancy) => {
        try {
            const titleLink = vacancy.querySelector('a.vt, a[href*="/vacancies/"]')
            const title = titleLink ? titleLink.textContent.trim() : ''
            const href = titleLink?.getAttribute('href') || ''
            const fullHref = href.startsWith('http') ? href : (href ? `https://jobs.dou.ua${href}` : null)
            const itemId = extractJobId(href)

            const companyLink = vacancy.querySelector('a[href*="/companies/"]')
            let company = ''
            if (companyLink) {
                company = Array.from(companyLink.childNodes)
                    .filter(n => n.nodeType === Node.TEXT_NODE)
                    .map(n => n.textContent.trim())
                    .join(' ')
                    .trim() || companyLink.textContent.trim()
            }

            const dateEl = vacancy.querySelector('.date, .add-date') || vacancy.querySelector('strong')
            const dateText = dateEl ? dateEl.textContent.trim() : ''
            const datePublish = parseDate(dateText)

            const citiesEl = vacancy.querySelector('.cities')
            let cities = citiesEl ? citiesEl.textContent.trim() : ''

            const salaryEl = vacancy.querySelector('.salary')
            let salaryText = salaryEl ? salaryEl.textContent.trim() : ''
            if (!salaryText) {
                const text = vacancy.textContent
                const salaryMatch = text.match(/(?:від\s*)?\$[\d\s]+(?:[–\-][\d\s]+)?/i)
                if (salaryMatch) {
                    salaryText = salaryMatch[0]
                }
            }
            const salary = parseSalary(salaryText)

            const shInfoEl = vacancy.querySelector('.sh-info')
            const shortDescription = shInfoEl ? shInfoEl.innerHTML.trim() : ''

            if (title && fullHref) {
                jobs.push({
                    parser: name,
                    itemId,
                    title,
                    company,
                    country: cities || 'Ukraine',
                    salary,
                    datePublish,
                    description: shortDescription,
                    href: fullHref,
                    _needsDetail: true,
                })
            }
        } catch (e) {
            console.error('[DOU] Failed to parse vacancy:', e)
        }
    })

    return jobs
}

const parseDetailPage = (doc, url) => {
    console.log('[DOU] Parsing detail page:', url)

    const titleEl = doc.querySelector('h1.g-h2, h1[class*="vacancy"], .vacancy-title h1')
    const title = titleEl ? titleEl.textContent.trim() : ''

    const companyEl = doc.querySelector('.l-n a, a[href*="/companies/"].company, .vacancy-company a')
    const company = companyEl ? companyEl.textContent.trim() : ''

    const salaryEl = doc.querySelector('.salary, .vacancy-salary, [class*="salary"]')
    const salaryText = salaryEl ? salaryEl.textContent.trim() : doc.body.textContent
    const salary = parseSalary(salaryText)

    const citiesEl = doc.querySelector('.cities, .vacancy-location, .sh-info')
    const cities = citiesEl ? citiesEl.textContent.trim() : ''

    const descriptionEl = doc.querySelector('.vacancy-section, .b-typo.vacancy-description, .text.b-typo, article.b-typo')
    let description = ''
    if (descriptionEl) {
        description = descriptionEl.innerHTML.trim()
    } else {
        const mainContent = doc.querySelector('.b-vacancy, .vacancy-content, main')
        if (mainContent) {
            description = mainContent.innerHTML.trim()
        }
    }

    const itemId = extractJobId(url)

    return {
        parser: name,
        itemId,
        title,
        company,
        country: cities || 'Ukraine',
        salary,
        datePublish: null,
        description,
        href: url,
    }
}

export const parse = (data) => {
    console.log('[DOU] Starting parse...')

    const doc = typeof data === 'string' ? htmlToDom(data) : data

    const isListPage = doc.querySelectorAll('li.l-vacancy').length > 0
    const isDetailPage = doc.querySelector('.vacancy-section, .b-typo.vacancy-description, h1.g-h2') !== null

    console.log('[DOU] Page type:', isListPage ? 'list' : isDetailPage ? 'detail' : 'unknown')

    if (isListPage) {
        const jobs = parseListPage(doc)
        console.log('[DOU] Parsed', jobs.length, 'jobs from list')
        return jobs
    }

    if (isDetailPage) {
        const job = parseDetailPage(doc, '')
        console.log('[DOU] Parsed detail page:', job.title)
        return job.title ? [job] : []
    }

    console.log('[DOU] Unknown page type')
    return []
}

export const parseDetail = (html, url) => {
    const doc = htmlToDom(html)
    return parseDetailPage(doc, url)
}

const isValidJobUrl = (url) => {
    return /\/vacancies\/\d+/.test(url)
}

export const extractJobUrls = (html) => {
    const doc = htmlToDom(html)
    const urls = []

    doc.querySelectorAll('li.l-vacancy a.vt, li.l-vacancy a[href*="/vacancies/"]').forEach(link => {
        const href = link.getAttribute('href')
        if (href) {
            const fullUrl = href.startsWith('http') ? href : `https://jobs.dou.ua${href}`
            if (!urls.includes(fullUrl) && isValidJobUrl(fullUrl)) {
                urls.push(fullUrl)
            }
        }
    })

    console.log('[DOU] Extracted', urls.length, 'job URLs')
    return urls
}

export const validate = (data) => {
    if (typeof data !== 'string') return false
    return data.includes('dou.ua') ||
           data.includes('l-vacancy') ||
           data.includes('vacancyListId') ||
           data.includes('vacancy-section')
}

// URL and pasted-HTML modes should automatically walk vacancy sublinks.
export const autoFetchDetails = true

export default {
    name,
    label,
    parse,
    parseDetail,
    extractJobUrls,
    validate,
    autoFetchDetails,
}
