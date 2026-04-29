import React, { useState, useRef, useEffect } from 'react'
import { exportDatabase, importJobs, getPrompt, savePrompt } from '../service/jobService'

const Settings = ({ onUpdate }) => {
    const [prompt, setPrompt] = useState('')
    const [promptLoading, setPromptLoading] = useState(true)
    const [promptSaving, setPromptSaving] = useState(false)
    const [promptSaved, setPromptSaved] = useState(false)
    const [exporting, setExporting] = useState(false)
    const [importing, setImporting] = useState(false)
    const [importResult, setImportResult] = useState(null)
    const [error, setError] = useState(null)
    const fileInputRef = useRef(null)

    useEffect(() => {
        const loadPrompt = async () => {
            try {
                const savedPrompt = await getPrompt()
                setPrompt(savedPrompt)
            } catch (e) {
                console.error('Failed to load prompt:', e)
            } finally {
                setPromptLoading(false)
            }
        }
        loadPrompt()
    }, [])

    const handleSavePrompt = async () => {
        setPromptSaving(true)
        setPromptSaved(false)
        setError(null)

        try {
            await savePrompt(prompt)
            setPromptSaved(true)
            setTimeout(() => setPromptSaved(false), 3000)
        } catch (e) {
            console.error('Failed to save prompt:', e)
            setError(`Failed to save prompt: ${e.message}`)
        } finally {
            setPromptSaving(false)
        }
    }

    const handleExport = async () => {
        setExporting(true)
        setError(null)

        try {
            const data = await exportDatabase()
            const json = JSON.stringify(data, null, 2)
            const blob = new Blob([json], { type: 'application/json' })
            const url = URL.createObjectURL(blob)

            const a = document.createElement('a')
            a.href = url
            a.download = `ai-job-db-${new Date().toISOString().slice(0, 10)}.json`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        } catch (e) {
            console.error('Export failed:', e)
            setError(`Export failed: ${e.message}`)
        } finally {
            setExporting(false)
        }
    }

    const handleImportClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        setImporting(true)
        setError(null)
        setImportResult(null)

        try {
            const text = await file.text()
            const data = JSON.parse(text)

            const jobs = Array.isArray(data) ? data : data.jobs

            if (!jobs || !Array.isArray(jobs)) {
                throw new Error('Invalid file format: expected jobs array')
            }

            const result = await importJobs(jobs)
            setImportResult(result)
            onUpdate?.()
        } catch (e) {
            console.error('Import failed:', e)
            setError(`Import failed: ${e.message}`)
        } finally {
            setImporting(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    return (
        <div className="row">
            <div className="col-6">
                <div className="card">
                    <div className="card-header">
                        <h5 className="mb-0">AI Prompt Settings</h5>
                    </div>
                    <div className="card-body">
                        <div className="mb-3">
                            <label className="form-label">Candidate Prompt</label>
                            {promptLoading ? (
                                <div className="text-muted">Loading...</div>
                            ) : (
                                <textarea
                                    className="form-control"
                                    rows={25}
                                    value={prompt}
                                    onChange={(e) => {
                                        setPrompt(e.target.value)
                                        setPromptSaved(false)
                                    }}
                                    placeholder="Enter your skills, experience, preferences..."
                                    style={{ fontFamily: 'monospace', fontSize: '12px' }}
                                />
                            )}
                            <div className="form-text">
                                Your skills, experience, and job preferences. This text replaces {'{candidate_prompt}'} in the main analysis prompt.
                            </div>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                            <button
                                className="btn btn-primary"
                                onClick={handleSavePrompt}
                                disabled={promptSaving || promptLoading}
                            >
                                {promptSaving ? 'Saving...' : 'Save Prompt'}
                            </button>
                            {promptSaved && (
                                <span className="text-success">Saved!</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="col-6">
                <div className="card">
                    <div className="card-header">
                        <h5 className="mb-0">Data Management</h5>
                    </div>
                    <div className="card-body">
                        <p className="text-muted mb-3">
                            Export or import your jobs database. Import will add new jobs and update existing ones without deleting.
                        </p>

                        <div className="d-flex gap-2 mb-3">
                            <button
                                className="btn btn-outline-primary"
                                onClick={handleExport}
                                disabled={exporting}
                            >
                                {exporting ? 'Exporting...' : 'Export Database'}
                            </button>

                            <button
                                className="btn btn-outline-success"
                                onClick={handleImportClick}
                                disabled={importing}
                            >
                                {importing ? 'Importing...' : 'Import Jobs'}
                            </button>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json"
                                style={{ display: 'none' }}
                                onChange={handleFileSelect}
                            />
                        </div>

                        {error && (
                            <div className="alert alert-danger mb-0">
                                {error}
                            </div>
                        )}

                        {importResult && (
                            <div className="alert alert-success mb-0">
                                Import complete: {importResult.imported} new, {importResult.updated} updated
                                {importResult.skipped > 0 && `, ${importResult.skipped} skipped`}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Settings
