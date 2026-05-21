export const name = 'linkedin'
export const label = 'LinkedIn'

export const browserScript = `async function scrapeLinkedInJobs() {
    console.log('🚀 Старт');

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const results = [];
    const seen = new Set();

    function getScrollableContainer() {
        const candidates = Array.from(document.querySelectorAll('div'));

        return candidates.find(el => {
            const style = window.getComputedStyle(el);
            return (
                (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
                el.scrollHeight > el.clientHeight &&
                el.innerText.includes('jobs')
            );
        });
    }

    function collectLinks() {
        document.querySelectorAll('a.job-card-container__link').forEach(a => {
            if (a.href) seen.add(a.href);
        });
    }

    async function scrollAndCollect() {
        let container = getScrollableContainer();

        if (!container) {
            console.log('⚠️ Контейнер не знайдено, скролю всю сторінку');
            container = document.scrollingElement || document.body;
        }

        let lastHeight = 0;

        for (let i = 0; i < 25; i++) {
            container.scrollTo(0, container.scrollHeight);
            await sleep(800);

            collectLinks();

            if (container.scrollHeight === lastHeight) break;
            lastHeight = container.scrollHeight;
        }

        container.scrollTo(0, 0);
        await sleep(500);

        collectLinks();

        console.log(\`📊 Лінків: \${seen.size}\`);
    }

    async function waitForContentChange(prevHTML, timeout = 15000) {
        const start = Date.now();

        while (Date.now() - start < timeout) {
            const el = document.querySelector('.job-view-layout.jobs-details');

            if (el && el.innerHTML !== prevHTML) {
                return el;
            }

            await sleep(300);
        }

        throw new Error('❌ Контент не оновився');
    }

    function findLink(href) {
        return Array.from(document.querySelectorAll('a.job-card-container__link'))
            .find(a => a.href === href);
    }

    await scrollAndCollect();

    const allLinks = Array.from(seen);
    let prevHTML = '';

    console.log(\`🎯 Обробка \${allLinks.length}\`);

    for (let i = 0; i < allLinks.length; i++) {
        const href = allLinks[i];

        try {
            console.log(\`👉 \${i + 1}/\${allLinks.length}\`);

            let link = findLink(href);

            if (!link) {
                window.scrollBy(0, 500);
                await sleep(500);
                link = findLink(href);
            }

            if (!link) {
                console.log('⚠️ Пропуск (нема в DOM)');
                continue;
            }

            link.scrollIntoView({ block: 'center' });
            await sleep(400);

            link.click();

            const details = await waitForContentChange(prevHTML);
            prevHTML = details.innerHTML;

            results.push(details.outerHTML);

            console.log('✅ Додано');

            await sleep(700);

        } catch (e) {
            console.log('❌', e);
        }
    }

    console.log('📦 Завершено');

    const blob = new Blob([JSON.stringify(results, null, 2)], {
        type: 'application/json'
    });

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'jobs_data.json';
    a.click();

    console.log('✅ Файл готовий');

    return results;
}

await scrapeLinkedInJobs();`

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

    const titleEl = root.querySelector('h1.t-24 a, h1 a[href*="/jobs/view/"], .job-details-jobs-unified-top-card__job-title a')
    const title = titleEl ? titleEl.textContent.trim() : ''
    console.log('[LinkedIn] Title:', title)

    const href = titleEl?.getAttribute('href') || ''
    const fullHref = href.startsWith('http') ? href : (href ? `https://www.linkedin.com${href}` : null)
    const itemId = extractJobId(href)

    const company = getText(root, '.job-details-jobs-unified-top-card__company-name a')

    const tertiaryText = getText(root, '.job-details-jobs-unified-top-card__tertiary-description-container')

    const locationMatch = tertiaryText.match(/^([^·]+)/)
    const country = locationMatch ? locationMatch[1].trim() : ''

    const datePublish = parseDate(tertiaryText)

    const descriptionEl = root.querySelector('#job-details .mt4, .jobs-description-content__text')
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

    let htmlArray = []

    if (typeof data === 'string') {
        const trimmed = data.trim()
        if (trimmed.startsWith('[')) {
            try {
                htmlArray = JSON.parse(trimmed)
                console.log('[LinkedIn] Parsed JSON array with', htmlArray.length, 'items')
            } catch (e) {
                console.error('[LinkedIn] Failed to parse JSON:', e)
                htmlArray = [trimmed]
            }
        } else {
            htmlArray = [trimmed]
        }
    } else if (Array.isArray(data)) {
        htmlArray = data
    }

    const jobs = []

    for (let i = 0; i < htmlArray.length; i++) {
        console.log(`[LinkedIn] Processing item ${i + 1}/${htmlArray.length}`)
        try {
            const job = parseJobDetail(htmlArray[i])
            if (job) {
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
    return data.includes('linkedin') ||
           data.includes('job-details') ||
           data.includes('jobs-unified-top-card')
}

export default {
    name,
    label,
    parse,
    validate,
    browserScript,
}
