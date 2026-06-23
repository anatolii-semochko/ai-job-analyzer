(async function scrapeLinkedInJobs() {

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

    function getJobState() {
        const panel = document.querySelector('.jobs-search__job-details--wrapper');

        const jobId =
            new URL(location.href).searchParams.get('currentJobId') ||
            location.pathname.match(/\/jobs\/view\/(\d+)/)?.[1] ||
            null;

        return { panel, jobId };
    }

    // -----------------------------
    // WAIT FOR JOB FULL LOAD (POLLING)
    // -----------------------------
    function waitForJobLoad(prevJobId, prevDescription = null) {
        return new Promise((resolve, reject) => {
            const start = Date.now();
            let stableContentTime = null;

            const interval = setInterval(() => {
                const {panel, jobId} = getJobState();

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
    // LEFT SIDE JOB LIST (FIXED SCOPING)
    // -----------------------------
    function collectJobs() {
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

    function parseCard(card) {

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

            const text = normalize(node.innerText);

            if (!text) continue;

            if (isSalary(text)) {
                result.salary = text;
                continue;
            }

            if (isMetadataNoise(text)) continue;

            if (!result.location) {
                result.location = text;
                continue;
            }

            result.insights.push(text);
        }

        return result;
    }

    function normalize(text) {

        return text
            .replace(/\s+/g, ' ')
            .replace(/\u00A0/g, ' ')
            .trim();
    }

    function isSalary(text) {

        return /(?:[$€£]|USD|EUR|GBP|CAD|AUD|CHF|PLN|CZK|SEK|NOK|DKK)/i.test(text)

            ||

            /\b\d+(?:[.,]\d+)?K\b/i.test(text)

            ||

            /\/\s*(yr|year|hr|hour|mo|month)/i.test(text)

            ||

            /\bper\s+(year|month|hour)\b/i.test(text);
    }

    function isMetadataNoise(text) {

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

    function extractJob(currentJobCard, panel, about) {
        const cardData = parseCard(currentJobCard.offsetParent);
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

    // -----------------------------
    // MAIN
    // -----------------------------
    const jobs = collectJobs();
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

            const {panel, jobId, about, description} = await waitForJobLoad(prevJobId, prevDescription);

            prevJobId = jobId;
            prevDescription = description;

            const result = extractJob(job, panel, about);

            console.log('=== RESULT ===', result);

            results.push(result);
        } catch (e) {
            console.error('Error on job ' + (i + 1) + ':', e.message);
        }
    }

    // -----------------------------
    // DOWNLOAD
    // -----------------------------
    const blob = new Blob([JSON.stringify(results, null, 2)], {
        type: 'application/json'
    });

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'linkedin_jobs.json';
    a.click();

    console.log('DONE');
    showDonePopup(jobs.length);
    return results;
})();
