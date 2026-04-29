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

export default {
    name,
    label,
    parse,
    validate,
}
