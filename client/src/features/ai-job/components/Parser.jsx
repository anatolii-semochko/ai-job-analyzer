import React, { useState } from 'react'
import { parse, getParsersList, extractJobUrls, parseDetail, supportsDetailPages, parsers } from '../parser/parser'
import { save, updateFilterOptions } from '../service/jobService'
import { fetchUrl, fetchBatch } from '@react/api/nodeApi'
import JobRightParser from './parser/JobRightParser'
import LinkedInParser from './parser/LinkedInParser'
import WorkUAParser from './parser/WorkUAParser'
import DOUParser from './parser/DOUParser'
import DjinniParser from './parser/DjinniParser'
import JobgetherParser from './parser/JobgetherParser'

const Parser = ({ onUpdate }) => {
    const [selectedParser, setSelectedParser] = useState('linkedin')
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

    const parserComponents = {
        jobright: JobRightParser,
        linkedin: LinkedInParser,
        workua: WorkUAParser,
        dou: DOUParser,
        djinni: DjinniParser,
        jobgether: JobgetherParser
    }

    const isUrl = inputData.trim().startsWith('http://') || inputData.trim().startsWith('https://')

    // The proxy's /fetch/batch endpoint caps a single request at 100 URLs, so
    // larger job lists (e.g. aggregated from several category pages) are split
    // into chunks and fetched sequentially.
    const BATCH_CHUNK_SIZE = 50

    const chunkArray = (arr, size) => {
        const chunks = []
        for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size))
        }
        return chunks
    }

    // Fetches+parses each of the given job URLs through the proxy server,
    // reporting overall progress via fetchProgress as it goes.
    const fetchAndParseJobUrls = async (parserName, jobUrls) => {
        setParsing(true)
        const parsedJobs = []
        let done = 0

        for (const chunk of chunkArray(jobUrls, BATCH_CHUNK_SIZE)) {
            setFetchProgress({ current: done, total: jobUrls.length, status: 'Fetching job details...' })
            const results = await fetchBatch(chunk)
            console.log('[Parser] Batch fetch results:', results.length)

            for (const result of results) {
                done++
                setFetchProgress({ current: done, total: jobUrls.length, status: 'Parsing...' })

                if (result.success && result.html) {
                    try {
                        const job = parseDetail(parserName, result.html, result.url)
                        if (job && job.title) {
                            parsedJobs.push(job)
                        }
                    } catch (e) {
                        console.error('[Parser] Failed to parse detail:', result.url, e)
                    }
                }
            }
        }

        console.log('[Parser] Parsed', parsedJobs.length, 'jobs with full details')
        return parsedJobs
    }

    // Given HTML of a list page, extracts vacancy sublinks and fetches+parses each
    // of them through the proxy server (same as the URL-input flow). Returns null
    // if the parser doesn't support detail pages or no vacancy links were found,
    // so the caller can fall back to a plain parse of the list page itself.
    const fetchJobDetails = async (parserName, listHtml) => {
        if (!supportsDetailPages(parserName)) {
            return null
        }

        const jobUrls = extractJobUrls(parserName, listHtml)
        console.log('[Parser] Found', jobUrls.length, 'job URLs')

        if (jobUrls.length === 0) {
            return null
        }

        return fetchAndParseJobUrls(parserName, jobUrls)
    }

    // Batch mode: fetches a list of category/listing URLs, aggregates and dedupes
    // all vacancy sublinks found across them, then fetches+parses every vacancy.
    const handleBatchParse = async (listUrls) => {
        const urls = [...new Set(listUrls.map(u => u.trim()).filter(Boolean))]
        if (urls.length === 0 || !supportsDetailPages(selectedParser)) return

        setError(null)
        setJobs([])
        setSaveResult(null)
        setFetching(true)
        setFetchProgress({ current: 0, total: urls.length, status: 'Fetching category pages...' })

        try {
            const jobUrlSet = new Set()

            for (let i = 0; i < urls.length; i++) {
                setFetchProgress({ current: i, total: urls.length, status: `Fetching category ${i + 1}/${urls.length}...` })
                try {
                    const listHtml = await fetchUrl(urls[i])
                    extractJobUrls(selectedParser, listHtml).forEach(u => jobUrlSet.add(u))
                } catch (e) {
                    console.error('[Parser] Failed to fetch category page:', urls[i], e)
                }
            }

            const jobUrls = Array.from(jobUrlSet)
            console.log('[Parser] Total unique job URLs across categories:', jobUrls.length)

            if (jobUrls.length === 0) {
                setError('No vacancies found across the provided category URLs')
                return
            }

            const parsedJobs = await fetchAndParseJobUrls(selectedParser, jobUrls)
            setJobs(parsedJobs)
            setExpandedJobs({})

            if (parsedJobs.length === 0) {
                setError('No jobs found in the provided data')
            }
        } catch (e) {
            console.error('[Parser] Batch parse error:', e)
            setError(`Failed to batch parse: ${e.message || e}`)
        } finally {
            setFetching(false)
            setParsing(false)
            setFetchProgress({ current: 0, total: 0 })
        }
    }

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
            setInputData(listHtml)

            const parsedJobs = await fetchJobDetails(selectedParser, listHtml)

            if (parsedJobs === null) {
                handleParseData(listHtml)
                return
            }

            setJobs(parsedJobs)
            setExpandedJobs({})

            if (parsedJobs.length === 0) {
                setError('No jobs found in the provided data')
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

    const handleParseData = async (data) => {
        setError(null)
        setSaveResult(null)
        setParsing(true)

        console.log('[Parser] Starting parse...')
        console.log('[Parser] Selected parser:', selectedParser)
        console.log('[Parser] Input data length:', data.length)

        try {
            const parsed = await parse(selectedParser, data)
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

    // Pasted/uploaded HTML mode: mirrors the URL-input flow above — if the data
    // looks like a list page for a parser that supports detail pages, fetch and
    // parse each vacancy sublink through the proxy instead of only reading the
    // short info visible on the list page itself.
    const handleParse = async () => {
        const data = inputData

        setError(null)
        setSaveResult(null)
        setFetching(true)
        setFetchProgress({ current: 0, total: 0 })

        try {
            const parsedJobs = await fetchJobDetails(selectedParser, data)

            if (parsedJobs === null) {
                await handleParseData(data)
                return
            }

            setJobs(parsedJobs)
            setExpandedJobs({})

            if (parsedJobs.length === 0) {
                setError('No jobs found in the provided data')
            }
        } catch (e) {
            console.error('[Parser] Fetch error:', e)
            setError(`Failed to fetch job details: ${e.message || e}`)
        } finally {
            setFetching(false)
            setParsing(false)
            setFetchProgress({ current: 0, total: 0 })
        }
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

        handleParse();
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
        <div className="row h-100">
            <div className="col-6 d-flex flex-column">
                <div className="card h-100 d-flex flex-column">
                    <div className="card-header flex-shrink-0">
                        <h5 className="mb-0">Input Data</h5>
                    </div>
                    <div className="card-body flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
                        <div className="mb-3 flex-shrink-0">
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

                        <div className="d-flex gap-2 mb-3 flex-shrink-0">
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
                                    disabled={fetching || parsing || !inputData.trim()}
                                >
                                    {fetching
                                        ? (fetchProgress.total > 0
                                            ? `Fetching ${fetchProgress.current}/${fetchProgress.total}...`
                                            : 'Fetching...')
                                        : parsing
                                            ? 'Parsing...'
                                            : 'Parse'}
                                </button>
                            )}
                        </div>

                        <div className="flex-shrink-0 mb-3">
                            <input
                                type="file"
                                className="form-control"
                                accept=".json,.txt,.html"
                                onChange={handleFileUpload}
                                disabled={parsing || fetching}
                            />
                        </div>

                        <div className="mb-3 flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
                            <textarea
                                className="form-control flex-grow-1"
                                value={inputData}
                                onChange={(e) => setInputData(e.target.value)}
                                placeholder="Paste URL, HTML or JSON data here..."
                                style={{
                                    fontFamily: 'monospace',
                                    fontSize: '12px',
                                    minHeight: '200px',
                                    resize: 'none',
                                    overflowX: 'hidden'
                                }}
                            />
                        </div>

                        {error && (
                            <div className="alert alert-danger mt-3 mb-0 flex-shrink-0">
                                {error}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="col-6 d-flex flex-column">
                <div className="card h-100 d-flex flex-column">
                    <div className="card-header d-flex justify-content-between align-items-center flex-shrink-0">
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
                    <div className="card-body flex-grow-1 d-flex flex-column" style={{ minHeight: 0, overflow: 'hidden auto' }}>
                        {saveResult && (
                            <div className="alert alert-success mb-3 flex-shrink-0">
                                Saved: {saveResult.created} created, {saveResult.updated} updated, {saveResult.unchanged} unchanged
                            </div>
                        )}

                        {jobs.length === 0 && (() => {
                            const ParserComponent = parserComponents[selectedParser]
                            return ParserComponent ? (
                                <ParserComponent
                                    parser={parsers[selectedParser]}
                                    jobs={jobs}
                                    onBatchParse={handleBatchParse}
                                    fetching={fetching}
                                    fetchProgress={fetchProgress}
                                />
                            ) : (
                                <p className="text-muted">No jobs parsed yet</p>
                            )
                        })()}

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
                                                        <span className="text-success">{job.salary}</span>
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

export default Parser
