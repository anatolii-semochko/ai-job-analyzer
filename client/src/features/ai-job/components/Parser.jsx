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

    const parserComponents = {
        jobright: JobRightParser,
        linkedin: LinkedInParser,
        workua: WorkUAParser,
        dou: DOUParser,
        djinni: DjinniParser,
        jobgether: JobgetherParser
    }

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

                        <div className="mb-3 flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
                            <label className="form-label">URL / HTML / JSON</label>
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
                                    disabled={parsing || !inputData.trim()}
                                >
                                    {parsing ? 'Parsing...' : 'Parse'}
                                </button>
                            )}
                        </div>

                        <div className="flex-shrink-0">
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

export default Parser
