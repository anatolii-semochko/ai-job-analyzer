(async function scrapeLinkedInJobs() {

    // ============================================================
    // COMMON (спільне для обох сценаріїв)
    // ============================================================

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    function showDonePopup(number) {
        const overlay = document.createElement('div');
        overlay.style = `
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 999999;
        `;

        const box = document.createElement('div');
        box.style = `
            background: white;
            padding: 20px;
            border-radius: 8px;
            font-family: sans-serif;
            text-align: center;
            min-width: 200px;
        `;

        const text = document.createElement('div');
        text.innerText = 'DONE ' + number;
        text.style.marginBottom = '12px';

        const btn = document.createElement('button');
        btn.innerText = 'CLOSE';
        btn.onclick = () => overlay.remove();

        box.appendChild(text);
        box.appendChild(btn);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
    }

    function downloadResults(results) {
        const blob = new Blob([JSON.stringify(results, null, 2)], {
            type: 'application/json'
        });

        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'linkedin_jobs.json';
        a.click();
    }

    function finishAndDownload(jobsLength, results) {
        downloadResults(results);

        console.log('DONE');
        showDonePopup(jobsLength);
        return results;
    }

    // ============================================================
    // СЦЕНАРІЙ 1 (немає блоку .jobs-search__job-details--wrapper)
    // ============================================================

    function getPanel1() {
        return document.querySelector('main');
    }

    function getJobState1() {
        const panel = getPanel1();
        const link = panel?.querySelector('a[href*="/jobs/view/"]');

        const jobId =
            link?.href?.match(/\/jobs\/view\/(\d+)/)?.[1] || null;

        return { panel, jobId };
    }

    // -----------------------------
    // WAIT FOR JOB FULL LOAD (POLLING) — scenario 1
    // -----------------------------
    function waitForJobLoad1(prevJobId, prevDescription = null) {
        return new Promise((resolve, reject) => {
            const start = Date.now();
            let stableContentTime = null;

            const interval = setInterval(() => {
                const { panel, jobId } = getJobState1();

                const about = panel?.querySelector(
                    '[componentkey^="JobDetails_AboutTheJob_"]'
                );

                const hasRealContent =
                    about &&
                    about.innerText &&
                    about.innerText.trim().length > 100;

                const isDifferentJob = jobId && jobId !== prevJobId;

                // Перевіряємо, чи контент відрізняється від попереднього
                const currentDescription = about?.innerHTML?.trim() || '';
                const isContentDifferent = !prevDescription || currentDescription !== prevDescription;

                if (isDifferentJob && hasRealContent) {
                    if (isContentDifferent) {
                        // Контент новий - дозволяємо завершити
                        if (!stableContentTime) {
                            stableContentTime = Date.now();
                        }
                        // Чекаємо 300ms стабільності контенту
                        if (Date.now() - stableContentTime >= 300) {
                            clearInterval(interval);
                            resolve({ panel, jobId, about, description: currentDescription });
                        }
                    } else {
                        // Контент такий же як попередній - скидаємо таймер стабільності
                        stableContentTime = null;
                    }
                }

                if (Date.now() - start > 25000) {
                    clearInterval(interval);
                    reject(new Error('Timeout waiting job load'));
                }
            }, 200);
        });
    }

    // -----------------------------
    // LEFT SIDE JOB LIST — scenario 1
    // -----------------------------
    function collectJobs1() {
        const root =
            document.querySelector('[componentkey="SearchResultsMainContent"]') ||
            document.querySelector('header + div') ||
            document.body;

        return Array.from(
            root.querySelectorAll('[role="button"]')
        ).filter(el => {
            return (
                el.offsetParent &&
                el.querySelector('span') // title marker = job card
            );
        });
    }

    // -----------------------------
    // EXTRACT DATA — scenario 1
    // -----------------------------
    function extractJob1(currentJobCard, panel, about) {
        const jobLink = panel.querySelector('a[href*="/jobs/view/"]');
        const companyLink = panel.querySelector('a[href*="/company/"]');

        const jobId =
            jobLink?.href?.match(/\/jobs\/view\/(\d+)/)?.[1] || null;

        const isDeactivated =
            !!panel.innerText.match(/No longer accepting applications/i);

        // Extract company from job card (more reliable)
        let company = companyLink?.innerText?.trim() || null;
        if (!company) {
            const cardText = currentJobCard.innerText;
            const lines = cardText.split('\n').map(line => line.trim()).filter(Boolean);
            // Company is typically at index 2 (after title)
            company = lines[2] || null;
        }

        return {
            jobId,
            title: jobLink?.innerText?.trim() || null,
            url: jobId ? 'https://www.linkedin.com/jobs/view/' + jobId + '/' : null,
            company: company,
            companyUrl: companyLink?.href || null,
            location: extractLocation1(currentJobCard),
            salary: extractSalary1(currentJobCard),
            description: sanitizeDescription1(about?.innerHTML),
            isDeactivated,
        };
    }

    function extractLocation1(currentJobCard) {
        if (!currentJobCard) return null;

        const text = currentJobCard.innerText;
        const lines = text.split('\n').map(line => line.trim()).filter(Boolean);

        // Location is typically at index 3 (after title and company)
        if (lines[3] &&
            !lines[3].includes('$') &&
            !lines[3].match(/\d+\s+(minute|hour|day|week|month)s?\s+ago/i) &&
            (lines[3].includes('Remote') ||
             lines[3].includes('United States') ||
             /\w+,\s*[A-Z]{2}/.test(lines[3]))) {
            return lines[3];
        }

        // Fallback: search for location pattern in all lines
        for (const line of lines) {
            if (!line.includes('$') &&
                !line.match(/\d+\s+(minute|hour|day|week|month)s?\s+ago/i) &&
                !line.includes('benefit') &&
                !line.includes('applicant') &&
                (
                    /\b(Remote|Hybrid|On-site)\b/i.test(line) ||
                    /\b(United States|Canada|New York|California|Texas|Florida|Phoenix|Brooklyn)\b/i.test(line) ||
                    /\w+,\s*[A-Z]{2}/.test(line)
                )) {
                return line;
            }
        }

        return null;
    }

    function extractSalary1(currentJobCard) {
        if (!currentJobCard) return null;

        const lines = currentJobCard.innerText
            .split('\n')
            .map(l => l.trim())
            .filter(Boolean);

        const currencyPattern =
            /(\$|€|£|USD|EUR|GBP)/i;

        const numberPattern =
            /\d[\d,]*(\.\d+)?K?/i;

        const rangePattern =
            /[-–]/;

        const periodPattern =
            /(\/\s?(yr|year|hr|hour|mo|month)|per\s+(year|hour|month))/i;

        const salaryRegex =
            new RegExp(
                currencyPattern.source + '.*' + numberPattern.source + '.*(' + rangePattern.source + '.*' + currencyPattern.source + '?.*' + numberPattern.source + ')?.*' + periodPattern.source,
                'i'
            );

        for (const line of lines) {
            const normalized = line.replace(/\s+/g, ' ').trim();

            if (salaryRegex.test(normalized)) {
                // додатковий safety-check: має бути хоча б одне число
                if (/\d/.test(normalized)) {
                    return normalized;
                }
            }
        }

        return null;
    }

    function parseSalaryFromText1(text) {
        if (!text) return null;

        // Більш детальні паттерни для LinkedIn форматів
        const salaryPatterns = [
            // $150K/yr - $200K/yr (range with K suffix)
            {
                pattern: /\$([\d,]+(?:\.\d+)?)K\s*\/\s*yr\s*-\s*\$([\d,]+(?:\.\d+)?)K\s*\/\s*yr/gi,
                process: (match) => {
                    const min = parseFloat(match[1].replace(/,/g, '')) * 1000;
                    const max = parseFloat(match[2].replace(/,/g, '')) * 1000;
                    return Math.round((min + max) / 2 / 12);
                }
            },
            // $135,000/yr - $170,000/yr (range without K)
            {
                pattern: /\$([\d,]+(?:\.\d+)?)\s*\/\s*yr\s*-\s*\$([\d,]+(?:\.\d+)?)\s*\/\s*yr/gi,
                process: (match) => {
                    const min = parseFloat(match[1].replace(/,/g, ''));
                    const max = parseFloat(match[2].replace(/,/g, ''));
                    return Math.round((min + max) / 2 / 12);
                }
            },
            // $75/hr - $85/hr (hourly range)
            {
                pattern: /\$([\d,]+(?:\.\d+)?)\s*\/\s*hr\s*-\s*\$([\d,]+(?:\.\d+)?)\s*\/\s*hr/gi,
                process: (match) => {
                    const min = parseFloat(match[1].replace(/,/g, ''));
                    const max = parseFloat(match[2].replace(/,/g, ''));
                    return Math.round((min + max) / 2 * 160);
                }
            },
            // $150K - $200K/yr (mixed format)
            {
                pattern: /\$([\d,]+(?:\.\d+)?)K\s*-\s*\$([\d,]+(?:\.\d+)?)K\s*\/\s*yr/gi,
                process: (match) => {
                    const min = parseFloat(match[1].replace(/,/g, '')) * 1000;
                    const max = parseFloat(match[2].replace(/,/g, '')) * 1000;
                    return Math.round((min + max) / 2 / 12);
                }
            },
            // $150 - $200K/yr (different format)
            {
                pattern: /\$([\d,]+(?:\.\d+)?)\s*-\s*([\d,]+(?:\.\d+)?)K\s*\/\s*yr/gi,
                process: (match) => {
                    const min = parseFloat(match[1].replace(/,/g, '')) * 1000; // assume first number is also in K
                    const max = parseFloat(match[2].replace(/,/g, '')) * 1000;
                    return Math.round((min + max) / 2 / 12);
                }
            },
            // $220K/yr (single with K)
            {
                pattern: /\$([\d,]+(?:\.\d+)?)K\s*\/\s*yr/gi,
                process: (match) => {
                    const amount = parseFloat(match[1].replace(/,/g, '')) * 1000;
                    return Math.round(amount / 12);
                }
            },
            // $220,000/yr (single without K)
            {
                pattern: /\$([\d,]+(?:\.\d+)?)\s*\/\s*yr/gi,
                process: (match) => {
                    const amount = parseFloat(match[1].replace(/,/g, ''));
                    return Math.round(amount / 12);
                }
            },
            // $85/hr (hourly single)
            {
                pattern: /\$([\d,]+(?:\.\d+)?)\s*\/\s*hr/gi,
                process: (match) => {
                    const amount = parseFloat(match[1].replace(/,/g, ''));
                    return Math.round(amount * 160);
                }
            },
        ];

        for (const salaryDef of salaryPatterns) {
            const match = text.match(salaryDef.pattern);
            if (match) {
                try {
                    const result = salaryDef.process(match);
                    if (result && result > 0 && result < 50000) { // reasonable monthly salary range
                        return result;
                    }
                } catch (e) {
                    continue;
                }
            }
        }

        return null;
    }

    function sanitizeDescription1(html) {
        if (!html) return null;

        const doc = new DOMParser().parseFromString(html, 'text/html');

        // 1. Видаляємо всі <button>
        doc.querySelectorAll('button').forEach(btn => btn.remove());

        // 2. Беремо HTML без кнопок
        let result = doc.body.innerHTML;

        // 3. \\n → <br>
        result = result.replace(/\\n/g, '<br>');

        return result;
    }

    async function runProcess1() {
        const jobs = collectJobs1();
        console.log('Found ' + jobs.length + ' jobs');

        const results = [];
        let prevJobId = null;
        let prevDescription = null;

        for (let i = 0; i < jobs.length; i++) {
            const job = jobs[i];

            try {
                console.log('Processing ' + (i + 1) + '/' + jobs.length);

                job.scrollIntoView({ block: 'center' });
                await sleep(300);

                job.click();

                const { panel, jobId, about, description } =
                    await waitForJobLoad1(prevJobId, prevDescription);

                prevJobId = jobId;
                prevDescription = description;

                const result = extractJob1(job, panel, about);

                console.log('=== RESULT ===', result);

                results.push(result);

                await sleep(400);

            } catch (e) {
                console.error('Error on job ' + (i + 1) + ':', e.message);
            }
        }

        return finishAndDownload(jobs.length, results);
    }

    // ============================================================
    // СЦЕНАРІЙ 2 (присутній блок .jobs-search__job-details--wrapper)
    // ============================================================

    function getJobState2() {
        const panel = document.querySelector('.jobs-search__job-details--wrapper');

        const jobId =
            new URL(location.href).searchParams.get('currentJobId') ||
            location.pathname.match(/\/jobs\/view\/(\d+)/)?.[1] ||
            null;

        return { panel, jobId };
    }

    // -----------------------------
    // WAIT FOR JOB FULL LOAD (POLLING) — scenario 2
    // -----------------------------
    function waitForJobLoad2(prevJobId, prevDescription = null) {
        return new Promise((resolve, reject) => {
            const start = Date.now();
            let stableContentTime = null;

            const interval = setInterval(() => {
                const {panel, jobId} = getJobState2();

                const about = panel?.querySelector('.jobs-box__html-content');

                const hasRealContent =
                    about &&
                    about.innerText &&
                    about.innerText.trim().length > 100;

                const isDifferentJob = jobId && jobId !== prevJobId;

                // Перевіряємо, чи контент відрізняється від попереднього
                const currentDescription = about?.innerHTML?.trim() || '';
                const isContentDifferent = !prevDescription || currentDescription !== prevDescription;

                if (isDifferentJob && hasRealContent) {
                    if (isContentDifferent) {
                        // Контент новий - дозволяємо завершити
                        if (!stableContentTime) {
                            stableContentTime = Date.now();
                        }
                        // Чекаємо 300ms стабільності контенту
                        if (Date.now() - stableContentTime >= 300) {
                            clearInterval(interval);
                            resolve({panel, jobId, about, description: currentDescription});
                        }
                    } else {
                        // Контент такий же як попередній - скидаємо таймер стабільності
                        stableContentTime = null;
                    }
                }

                if (Date.now() - start > 25000) {
                    clearInterval(interval);
                    reject(new Error('Timeout waiting job load'));
                }
            }, 200);
        });
    }

    // -----------------------------
    // LEFT SIDE JOB LIST — scenario 2
    // -----------------------------
    function collectJobs2() {
        const root =
            document.querySelector('[componentkey="SearchResultsMainContent"]') ||
            document.querySelector('header + div') ||
            document.querySelector('.scaffold-layout__list-item') ||
            document.body;

        return Array.from(
            document.querySelectorAll('a[href^="/jobs/view/"]')
            // root.querySelectorAll('[role="button"]')
        ).filter(el => {
            return (
                el.offsetParent &&
                el.querySelector('span') // title marker = job card
            );
        });
    }

    function parseCard2(card) {

        const result = {
            title: null,
            company: null,
            location: null,
            salary: null,
            insights: []
        };

        result.title =
            card.querySelector('.job-card-list__title')
                ?.textContent
                ?.trim();

        result.company =
            card.querySelector('.artdeco-entity-lockup__subtitle')
                ?.textContent
                ?.trim();

        const metadataNodes = [
            ...card.querySelectorAll(
                '.job-card-container__metadata-wrapper li, \
                 .job-card-list__insight, \
                 .job-card-container__footer-item'
            )
        ];

        for (const node of metadataNodes) {

            const text = normalize2(node.innerText);

            if (!text) continue;

            if (isSalary2(text)) {
                result.salary = text;
                continue;
            }

            if (isMetadataNoise2(text)) continue;

            if (!result.location) {
                result.location = text;
                continue;
            }

            result.insights.push(text);
        }

        return result;
    }

    function normalize2(text) {

        return text
            .replace(/\s+/g, ' ')
            .replace(/\u00A0/g, ' ')
            .trim();
    }

    function isSalary2(text) {

        return /(?:[$€£]|USD|EUR|GBP|CAD|AUD|CHF|PLN|CZK|SEK|NOK|DKK)/i.test(text)

            ||

            /\b\d+(?:[.,]\d+)?K\b/i.test(text)

            ||

            /\/\s*(yr|year|hr|hour|mo|month)/i.test(text)

            ||

            /\bper\s+(year|month|hour)\b/i.test(text);
    }

    function isMetadataNoise2(text) {

        return [

            /applicant/i,
            /review/i,
            /benefit/i,
            /promoted/i,
            /reposted/i,
            /easy apply/i,
            /viewed/i,
            /actively reviewing/i,
            /response/i,
            /matches your preferences/i

        ].some(r => r.test(text));
    }

    function extractJob2(currentJobCard, panel, about) {
        const cardData = parseCard2(currentJobCard.offsetParent);
        const jobLink = panel.querySelector('a[href*="/jobs/view/"]');
        const companyLink = panel.querySelector('.job-details-jobs-unified-top-card__company-name');
        const jobId = jobLink?.href?.match(/\/jobs\/view\/(\d+)/)?.[1] || null;
        const isDeactivated = !!panel.innerText.match(/No longer accepting applications/i);

        return {
            jobId,
            title: jobLink?.innerText?.trim() || null,
            url: jobId ? 'https://www.linkedin.com/jobs/view/' + jobId + '/' : null,
            company: cardData.company,
            companyUrl: companyLink?.href || null,
            location: cardData.location,
            salary: cardData.salary,
            description: about?.innerHTML,
            isDeactivated,
        };
    }

    async function runProcess2() {
        const jobs = collectJobs2();
        console.log('Found ' + jobs.length + ' jobs');

        const results = [];
        let prevJobId = null;
        let prevDescription = null;

        for (let i = 0; i < jobs.length; i++) {
            const job = jobs[i];

            try {
                console.log('Processing ' + (i + 1) + '/' + jobs.length);

                job.scrollIntoView({ block: 'center' });
                job.click();

                const {panel, jobId, about, description} = await waitForJobLoad2(prevJobId, prevDescription);

                prevJobId = jobId;
                prevDescription = description;

                const result = extractJob2(job, panel, about);

                console.log('=== RESULT ===', result);

                results.push(result);
            } catch (e) {
                console.error('Error on job ' + (i + 1) + ':', e.message);
            }
        }

        return finishAndDownload(jobs.length, results);
    }

    // ============================================================
    // DISPATCH: визначаємо тип сторінки і запускаємо потрібний сценарій
    // ============================================================

    const hasNewLayout = !!document.querySelector('.jobs-search__job-details--wrapper');

    if (hasNewLayout) {
        console.log('[LinkedIn scraper] Виявлено .jobs-search__job-details--wrapper — запуск сценарію 2');
        return await runProcess2();
    }

    console.log('[LinkedIn scraper] .jobs-search__job-details--wrapper не знайдено — запуск сценарію 1');
    return await runProcess1();
})();
