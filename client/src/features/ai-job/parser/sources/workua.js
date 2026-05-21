export const name = 'workua'
export const label = 'Work.UA'

export const browserScript = `async function scrapeWorkUaJobs() {
    console.log('🚀 Початок парсингу Work.ua');

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const results = [];

    function parseJobCard(card) {
        try {
            const titleLink = card.querySelector('h2 a');
            if (!titleLink) return null;

            const title = titleLink.textContent.trim();
            const href = titleLink.href;
            const itemId = href.match(/\\/jobs\\/(\\d+)\\//)?.[1] || null;

            const salaryEl = card.querySelector('p span.tw-font-semibold');
            const salary = salaryEl ? salaryEl.textContent.trim() : '';

            const companyEl = card.querySelector('span.tw-font-semibold');
            const company = companyEl ? companyEl.textContent.trim() : '';

            const locationEl = card.querySelector('p:nth-of-type(3)');
            const location = locationEl ? locationEl.textContent.replace(company, '').trim() : '';

            const dateEl = card.querySelector('time');
            const datePublish = dateEl ? dateEl.textContent.trim() : '';

            const descEl = card.querySelector('p.tw-break-words');
            const description = descEl ? descEl.textContent.trim() : '';

            return {
                title,
                company,
                location,
                salary,
                datePublish,
                description,
                href,
                itemId
            };
        } catch (e) {
            console.error('Помилка парсингу картки:', e);
            return null;
        }
    }

    async function fetchJobDetails(job) {
        try {
            console.log('Завантажую деталі для: ' + job.title);

            const response = await fetch(job.href);
            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }

            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const descriptionEl = doc.querySelector('.card-text, .job-description, [class*="description"]');
            const fullDescription = descriptionEl ? descriptionEl.innerHTML : job.description;

            return {
                ...job,
                description: fullDescription
            };
        } catch (e) {
            console.error('Помилка завантаження деталей для ' + job.href + ':', e);
            return job;
        }
    }

    const jobCards = document.querySelectorAll('[id^="job-"]');
    console.log('Знайдено ' + jobCards.length + ' карток вакансій');

    for (let i = 0; i < jobCards.length; i++) {
        const card = jobCards[i];
        const job = parseJobCard(card);

        if (job) {
            console.log('Парсинг ' + (i + 1) + '/' + jobCards.length + ': ' + job.title);

            const detailedJob = await fetchJobDetails(job);
            results.push(detailedJob);

            if (i < jobCards.length - 1) {
                await sleep(1000 + Math.random() * 2000);
            }
        }
    }

    console.log('✅ Завершено. Знайдено ' + results.length + ' вакансій');

    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workua-jobs-' + new Date().toISOString().split('T')[0] + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('📁 Файл збережено!');
    return results;
}

await scrapeWorkUaJobs();`

const parseSalary = (text) => {
    if (!text) return null

    const hryvniaMatch = text.match(/([\d\s]+)\s*(?:-|–|до)\s*([\d\s]+)\s*грн/i)
    if (hryvniaMatch) {
        const min = parseFloat(hryvniaMatch[1].replace(/\s/g, ''))
        const max = parseFloat(hryvniaMatch[2].replace(/\s/g, ''))
        const avg = (min + max) / 2
        return Math.round(avg / 43)
    }

    const singleHryvniaMatch = text.match(/([\d\s]+)\s*грн/i)
    if (singleHryvniaMatch) {
        const value = parseFloat(singleHryvniaMatch[1].replace(/\s/g, ''))
        return Math.round(value / 43)
    }

    const dollarMatch = text.match(/\$\s*([\d,]+(?:\.\d+)?)\s*-\s*\$\s*([\d,]+(?:\.\d+)?)/i)
    if (dollarMatch) {
        const min = parseFloat(dollarMatch[1].replace(/,/g, ''))
        const max = parseFloat(dollarMatch[2].replace(/,/g, ''))
        return Math.round((min + max) / 2)
    }

    const singleDollarMatch = text.match(/\$\s*([\d,]+(?:\.\d+)?)/i)
    if (singleDollarMatch) {
        const value = parseFloat(singleDollarMatch[1].replace(/,/g, ''))
        return Math.round(value)
    }

    return null
}

const parseDate = (text) => {
    if (!text) return null

    const now = new Date()

    const match = text.match(/(\d+)\s*(година|години|годин|день|дня|днів|тиждень|тижня|тижнів|місяць|місяця|місяців)\s*тому/i)
    if (match) {
        const num = parseInt(match[1], 10)
        const unit = match[2].toLowerCase()

        if (unit.includes('годин')) {
            now.setHours(now.getHours() - num)
        } else if (unit.includes('день') || unit.includes('дня') || unit.includes('днів')) {
            now.setDate(now.getDate() - num)
        } else if (unit.includes('тиждень') || unit.includes('тижня') || unit.includes('тижнів')) {
            now.setDate(now.getDate() - num * 7)
        } else if (unit.includes('місяць') || unit.includes('місяця') || unit.includes('місяців')) {
            now.setMonth(now.getMonth() - num)
        }

        return now.toISOString().split('T')[0]
    }

    return null
}

const extractJobId = (href) => {
    if (!href) return null
    const match = href.match(/\/jobs\/(\d+)/)
    return match ? match[1] : null
}

export const parse = (data) => {
    console.log('[Work.UA] Starting parse...')

    let jobsArray = []

    if (typeof data === 'string') {
        const trimmed = data.trim()
        if (trimmed.startsWith('[')) {
            try {
                jobsArray = JSON.parse(trimmed)
                console.log('[Work.UA] Parsed JSON array with', jobsArray.length, 'items')
            } catch (e) {
                console.error('[Work.UA] Failed to parse JSON:', e)
                return []
            }
        } else {
            console.error('[Work.UA] Expected JSON array format')
            return []
        }
    } else if (Array.isArray(data)) {
        jobsArray = data
    }

    const jobs = []

    for (let i = 0; i < jobsArray.length; i++) {
        console.log(`[Work.UA] Processing item ${i + 1}/${jobsArray.length}`)
        try {
            const jobData = jobsArray[i]

            if (!jobData || typeof jobData !== 'object') {
                console.log('[Work.UA] Skipped - invalid job data')
                continue
            }

            const {
                title,
                company,
                location,
                salary: salaryText,
                datePublish,
                description,
                href,
                itemId
            } = jobData

            const salary = parseSalary(salaryText)
            const parsedDate = parseDate(datePublish) || datePublish

            if (!title) {
                console.log('[Work.UA] Skipped - no title')
                continue
            }

            const job = {
                parser: name,
                itemId: itemId || extractJobId(href),
                title: title.trim(),
                company: company ? company.trim() : '',
                country: location ? location.trim() : 'Ukraine',
                salary,
                datePublish: parsedDate,
                description: description || '',
                href: href || '',
            }

            jobs.push(job)
            console.log('[Work.UA] Job added:', job.title)
        } catch (e) {
            console.error('[Work.UA] Failed to parse item', i, e)
        }
    }

    console.log('[Work.UA] Parse complete. Total jobs:', jobs.length)
    return jobs
}

export const validate = (data) => {
    if (typeof data !== 'string') return false
    return data.includes('work.ua') ||
           data.includes('work-ua') ||
           data.includes('workua')
}

export default {
    name,
    label,
    parse,
    validate,
    browserScript,
}