import React, { useState } from 'react'
import { parse, getParsersList, extractJobUrls, parseDetail, supportsDetailPages } from '../parser/parser'
import { save, updateFilterOptions } from '../service/jobService'
import { fetchUrl, fetchBatch } from '@react/api/nodeApi'

const Parser = ({ onUpdate }) => {
    const [selectedParser, setSelectedParser] = useState('dou')
    const [inputData, setInputData] = useState('')
    const [jobs, setJobs] = useState([])
    const [expandedJobs, setExpandedJobs] = useState({})
    const [parsing, setParsing] = useState(false)
    const [fetching, setFetching] = useState(false)
    const [fetchProgress, setFetchProgress] = useState({ current: 0, total: 0 })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)
    const [saveResult, setSaveResult] = useState(null)
    const [uploadedFile, setUploadedFile] = useState(null)

    const parsersList = getParsersList()

    const isUrl = inputData.trim().startsWith('http://') || inputData.trim().startsWith('https://')

    const handleFetchAndParse = async () => {
        if (!isUrl) return

        setError(null)
        setJobs([])
        setFetching(true)
        setFetchProgress({ current: 0, total: 0 })

        try {
            const url = inputData.trim()
            console.log('[Parser] Fetching URL:', url)

            setFetchProgress({ current: 0, total: 1, status: 'Fetching list page...' })
            const listHtml = await fetchUrl(url)
            console.log('[Parser] Fetched list HTML:', listHtml.length, 'bytes')

            if (supportsDetailPages(selectedParser)) {
                const jobUrls = extractJobUrls(selectedParser, listHtml)
                console.log('[Parser] Found', jobUrls.length, 'job URLs')

                if (jobUrls.length === 0) {
                    handleParseData(listHtml)
                    return
                }

                setFetchProgress({ current: 0, total: jobUrls.length, status: 'Fetching job details...' })

                const results = await fetchBatch(jobUrls)
                console.log('[Parser] Batch fetch results:', results.length)

                setParsing(true)
                const parsedJobs = []

                for (let i = 0; i < results.length; i++) {
                    const result = results[i]
                    setFetchProgress({ current: i + 1, total: results.length, status: 'Parsing...' })

                    if (result.success && result.html) {
                        try {
                            const job = parseDetail(selectedParser, result.html, result.url)
                            if (job && job.title) {
                                parsedJobs.push(job)
                            }
                        } catch (e) {
                            console.error('[Parser] Failed to parse detail:', result.url, e)
                        }
                    }
                }

                console.log('[Parser] Parsed', parsedJobs.length, 'jobs with full details')
                setJobs(parsedJobs)
                setExpandedJobs({})

                if (parsedJobs.length === 0) {
                    setError('No jobs found in the provided data')
                }

                setInputData(listHtml)
            } else {
                setInputData(listHtml)
                handleParseData(listHtml)
            }
        } catch (e) {
            console.error('[Parser] Fetch error:', e)
            setError(`Failed to fetch: ${e.message || e}`)
        } finally {
            setFetching(false)
            setParsing(false)
            setFetchProgress({ current: 0, total: 0 })
        }
    }

    const handleParseData = (data) => {
        setError(null)
        setSaveResult(null)
        setParsing(true)

        console.log('[Parser] Starting parse...')
        console.log('[Parser] Selected parser:', selectedParser)
        console.log('[Parser] Input data length:', data.length)

        try {
            const parsed = parse(selectedParser, data)
            console.log('[Parser] Parsed result:', parsed)
            setJobs(parsed)
            setExpandedJobs({})

            if (parsed.length === 0) {
                setError('No jobs found in the provided data')
            }
        } catch (e) {
            console.error('[Parser] Error:', e)
            setError(e.message)
            setJobs([])
        } finally {
            setParsing(false)
        }
    }

    const handleParse = () => {
        handleParseData(inputData)
    }

    const handleFileUpload = (event) => {
        const file = event.target.files[0]
        if (!file) return

        setUploadedFile(file)
        setError(null)
        setSaveResult(null)

        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const content = e.target.result
                setInputData(content)

                if (file.name.toLowerCase().endsWith('.json')) {
                    JSON.parse(content)
                }

                console.log('[Parser] File uploaded:', file.name, 'Size:', file.size)
            } catch (error) {
                console.error('[Parser] File reading error:', error)
                setError(`Failed to read file: ${error.message}`)
            }
        }
        reader.onerror = () => {
            setError('Failed to read file')
        }
        reader.readAsText(file)
    }

    const handleParseUploadedFile = () => {
        if (!uploadedFile) return
        handleParseData(inputData)
    }

    const handleSaveJobs = async () => {
        if (jobs.length === 0) return

        setSaving(true)
        setSaveResult(null)
        setError(null)

        try {
            const results = { created: 0, updated: 0, unchanged: 0 }

            for (const job of jobs) {
                const { action } = await save(job)
                results[action]++
            }

            setSaveResult(results)
            await updateFilterOptions()
            onUpdate?.()
        } catch (e) {
            setError(`Failed to save: ${e.message}`)
        } finally {
            setSaving(false)
        }
    }

    const toggleExpand = (index) => {
        setExpandedJobs(prev => ({
            ...prev,
            [index]: !prev[index]
        }))
    }

    return (
        <div className="row">
            <div className="col-6">
                <div className="card">
                    <div className="card-header">
                        <h5 className="mb-0">Input Data</h5>
                    </div>
                    <div className="card-body">
                        <div className="mb-3">
                            <label className="form-label">Parser</label>
                            <select
                                className="form-select"
                                value={selectedParser}
                                onChange={(e) => {
                                    setSelectedParser(e.target.value)
                                    setJobs([])
                                    setExpandedJobs({})
                                    setError(null)
                                    setSaveResult(null)
                                }}
                            >
                                {parsersList.map(p => (
                                    <option key={p.name} value={p.name}>
                                        {p.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="mb-3">
                            <label className="form-label">URL / HTML / JSON</label>
                            <textarea
                                className="form-control"
                                rows={15}
                                value={inputData}
                                onChange={(e) => setInputData(e.target.value)}
                                placeholder="Paste URL, HTML or JSON data here..."
                                style={{ fontFamily: 'monospace', fontSize: '12px' }}
                            />
                        </div>

                        <div className="d-flex gap-2">
                            {isUrl ? (
                                <button
                                    className="btn btn-primary w-100"
                                    onClick={handleFetchAndParse}
                                    disabled={fetching || parsing}
                                >
                                    {fetching
                                        ? (fetchProgress.total > 0
                                            ? `Fetching ${fetchProgress.current}/${fetchProgress.total}...`
                                            : 'Fetching...')
                                        : parsing
                                            ? 'Parsing...'
                                            : 'Fetch & Parse'}
                                </button>
                            ) : (
                                <button
                                    className="btn btn-primary w-100"
                                    onClick={handleParse}
                                    disabled={parsing || !inputData.trim()}
                                >
                                    {parsing ? 'Parsing...' : 'Parse'}
                                </button>
                            )}
                        </div>

                        <div className="mt-3">
                            <label className="form-label">Or upload file:</label>
                            <input
                                type="file"
                                className="form-control"
                                accept=".json,.txt,.html"
                                onChange={handleFileUpload}
                                disabled={parsing || fetching}
                            />
                            {uploadedFile && (
                                <div className="mt-2">
                                    <small className="text-muted">
                                        Uploaded: {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)} KB)
                                    </small>
                                    <button
                                        className="btn btn-sm btn-outline-primary ms-2"
                                        onClick={handleParseUploadedFile}
                                        disabled={parsing || !inputData.trim()}
                                    >
                                        {parsing ? 'Parsing...' : 'Parse File'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="alert alert-danger mt-3 mb-0">
                                {error}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="col-6">
                <div className="card">
                    <div className="card-header d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">Parsed Jobs ({jobs.length})</h5>
                        {jobs.length > 0 && (
                            <button
                                className="btn btn-success btn-sm"
                                onClick={handleSaveJobs}
                                disabled={saving}
                            >
                                {saving ? 'Saving...' : 'Save Jobs'}
                            </button>
                        )}
                    </div>
                    <div className="card-body" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                        {saveResult && (
                            <div className="alert alert-success mb-3">
                                Saved: {saveResult.created} created, {saveResult.updated} updated, {saveResult.unchanged} unchanged
                            </div>
                        )}

                        {selectedParser === 'linkedin' && jobs.length === 0 && (
                            <LinkedInScript />
                        )}

                        {selectedParser === 'dou' && jobs.length === 0 && (
                            <DOUScript />
                        )}

                        {selectedParser === 'workua' && jobs.length === 0 && (
                            <WorkuaScript />
                        )}

                        {jobs.length === 0 && !['linkedin', 'dou', 'workua'].includes(selectedParser) && (
                            <p className="text-muted">No jobs parsed yet</p>
                        )}

                        {jobs.length > 0 && (
                            <div className="list-group">
                                {jobs.map((job, index) => (
                                    <div key={index} className="list-group-item">
                                        <div className="d-flex justify-content-between align-items-start">
                                            <div className="flex-grow-1">
                                                <div className="d-flex align-items-center mb-1">
                                                    <span className="badge bg-secondary me-2">{index + 1}</span>
                                                    <strong>{job.title}</strong>
                                                </div>
                                                <div className="text-muted small">
                                                    <span className="me-3">{job.company || 'N/A'}</span>
                                                    <span className="me-3">{job.country || 'N/A'}</span>
                                                    {job.salary && (
                                                        <span className="text-success">${job.salary}</span>
                                                    )}
                                                </div>
                                            </div>
                                            {job.description && (
                                                <button
                                                    className="btn btn-outline-secondary btn-sm"
                                                    onClick={() => toggleExpand(index)}
                                                >
                                                    {expandedJobs[index] ? '−' : '+'}
                                                </button>
                                            )}
                                        </div>

                                        {expandedJobs[index] && job.description && (
                                            <div
                                                className="mt-2 p-2 bg-light rounded small"
                                                dangerouslySetInnerHTML={{ __html: job.description }}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

const linkedInScript = `
async function scrapeLinkedInJobs() {
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

await scrapeLinkedInJobs();
`

const LinkedInScript = () => {
    const handleCopyScript = () => {
        navigator.clipboard.writeText(linkedInScript).then(() => {
            // Could add a toast notification here
        }).catch(err => {
            console.error('Failed to copy script: ', err)
        })
    }

    return (
        <div className="alert alert-info">
            <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="alert-heading mb-0">LinkedIn Parser Script</h6>
                <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={handleCopyScript}
                    title="Copy script to clipboard"
                >
                    📋 Copy Script
                </button>
            </div>
            <p className="small mb-2">
                Виконай цей скрипт в консолі браузера на сторінці LinkedIn Jobs:
            </p>
            <pre
                className="bg-dark text-light p-2 rounded small"
                style={{ maxHeight: '300px', overflow: 'auto', fontSize: '11px' }}
            >
                {linkedInScript}
            </pre>
            <p className="small mb-0 mt-2">
                Після завантаження файлу <code>jobs_data.json</code>, вставте його вміст у поле зліва.
            </p>
        </div>
    )
}

const DOUScript = () => {
    const exampleUrl = "https://jobs.dou.ua/vacancies/?category=Blockchain"

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(exampleUrl).then(() => {
            // Could add a toast notification here
        }).catch(err => {
            console.error('Failed to copy URL: ', err)
        })
    }

    return (
        <div className="alert alert-info">
            <h6 className="alert-heading">DOU.ua Parser</h6>
            <p className="small mb-2">
                <strong>Спосіб 1 (рекомендовано):</strong> Встав URL сторінки з вакансіями, наприклад:
            </p>
            <div className="d-flex align-items-center gap-2 mb-2">
                <pre className="bg-dark text-light p-2 rounded small flex-grow-1 mb-0" style={{ fontSize: '11px' }}>
                    {exampleUrl}
                </pre>
                <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={handleCopyUrl}
                    title="Copy example URL to clipboard"
                >
                    📋 Copy
                </button>
            </div>
            <p className="small mb-0">
                <strong>Спосіб 2:</strong> Скопіюй HTML зі сторінки (Ctrl+A, Ctrl+C) і встав сюди.
            </p>
        </div>
    )
}

const workuaScript = `
async function scrapeWorkUaJobs() {
    console.log('🚀 Початок парсингу Work.ua');

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const results = [];

    function parseJobCard(card) {
        try {
            const titleLink = card.querySelector('h2 a');
            if (!titleLink) return null;

            const title = titleLink.textContent.trim();
            const href = titleLink.href;
            const itemId = href.match(/\\/jobs\\/(\\\\d+)\\//)?.[1] || null;

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

await scrapeWorkUaJobs();
`

const WorkuaScript = () => {
    const handleCopyScript = () => {
        navigator.clipboard.writeText(workuaScript).then(() => {
            // Could add a toast notification here
        }).catch(err => {
            console.error('Failed to copy script: ', err)
        })
    }

    return (
        <div className="alert alert-info">
            <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="alert-heading mb-0">Work.UA Parser Script</h6>
                <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={handleCopyScript}
                    title="Copy script to clipboard"
                >
                    📋 Copy Script
                </button>
            </div>
            <p className="small mb-2">
                Виконай цей скрипт в консолі браузера на сторінці Work.ua з вакансіями:
            </p>
            <div className="d-flex align-items-center gap-2 mb-2">
                <pre className="bg-dark text-light p-2 rounded small flex-grow-1 mb-0" style={{ fontSize: '11px' }}>
                    https://www.work.ua/jobseeker/my/personal-feed/
                </pre>
                <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => navigator.clipboard.writeText('https://www.work.ua/jobseeker/my/personal-feed/')}
                    title="Copy URL to clipboard"
                >
                    📋 Copy
                </button>
            </div>
            <pre
                className="bg-dark text-light p-2 rounded small"
                style={{ maxHeight: '300px', overflow: 'auto', fontSize: '11px' }}
            >
                {workuaScript}
            </pre>
            <p className="small mb-0 mt-2">
                Скрипт автоматично завантажить деталі всіх вакансій та створить JSON файл для завантаження.
                Після завантаження файлу, скопіюй його вміст і встав у поле вводу вище.
            </p>
        </div>
    )
}

export default Parser
