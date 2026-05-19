import React, { useState, useEffect } from 'react'
import { exportDatabase, importJobs, getPrompt, savePrompt, getApplyPrompt, saveApplyPrompt } from '../service/jobService'
import { PromptEditor, DataManager } from './common/Components'

const Settings = ({ onUpdate }) => {
    const [prompt, setPrompt] = useState('')
    const [promptLoading, setPromptLoading] = useState(true)
    const [promptSaving, setPromptSaving] = useState(false)
    const [promptSaved, setPromptSaved] = useState(false)
    const [applyPrompt, setApplyPrompt] = useState('')
    const [applyPromptLoading, setApplyPromptLoading] = useState(true)
    const [applyPromptSaving, setApplyPromptSaving] = useState(false)
    const [applyPromptSaved, setApplyPromptSaved] = useState(false)
    const [exporting, setExporting] = useState(false)
    const [importing, setImporting] = useState(false)
    const [importResult, setImportResult] = useState(null)
    const [error, setError] = useState(null)

    useEffect(() => {
        const loadPrompts = async () => {
            try {
                const [savedPrompt, savedApplyPrompt] = await Promise.all([
                    getPrompt(),
                    getApplyPrompt()
                ])
                setPrompt(savedPrompt)
                setApplyPrompt(savedApplyPrompt)
            } catch (e) {
                console.error('Failed to load prompts:', e)
            } finally {
                setPromptLoading(false)
                setApplyPromptLoading(false)
            }
        }
        loadPrompts()
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

    const handleSaveApplyPrompt = async () => {
        setApplyPromptSaving(true)
        setApplyPromptSaved(false)
        setError(null)

        try {
            await saveApplyPrompt(applyPrompt)
            setApplyPromptSaved(true)
            setTimeout(() => setApplyPromptSaved(false), 3000)
        } catch (e) {
            console.error('Failed to save apply prompt:', e)
            setError(`Failed to save apply prompt: ${e.message}`)
        } finally {
            setApplyPromptSaving(false)
        }
    }

    const handlePromptChange = (value) => {
        setPrompt(value)
        setPromptSaved(false)
    }

    const handleApplyPromptChange = (value) => {
        setApplyPrompt(value)
        setApplyPromptSaved(false)
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
            // Clear file input
            e.target.value = ''
        }
    }

    return (
        <div className="row h-100">
            <div className="col-6 d-flex flex-column">
                <div className="flex-shrink-0">
                    <PromptEditor
                        title="AI Prompt Settings"
                        label="Candidate Prompt"
                        value={prompt}
                        loading={promptLoading}
                        saving={promptSaving}
                        saved={promptSaved}
                        onChange={handlePromptChange}
                        onSave={handleSavePrompt}
                        placeholder="Enter your skills, experience, preferences..."
                        rows={20}
                        helpText="Your skills, experience, and job preferences. This text replaces {candidate_prompt} in the main analysis prompt."
                    />
                </div>

                <div className="mt-3 flex-grow-1">
                    <PromptEditor
                        title="Apply Prompt Template"
                        label="Apply Prompt"
                        value={applyPrompt}
                        loading={applyPromptLoading}
                        saving={applyPromptSaving}
                        saved={applyPromptSaved}
                        onChange={handleApplyPromptChange}
                        onSave={handleSaveApplyPrompt}
                        placeholder="Hello [Company] Team,&#10;&#10;I would like to apply for the [Role] position..."
                        rows={12}
                        helpText="Your personal application template. Use [Company] and [Role] placeholders that will be replaced with actual values."
                    />
                </div>
            </div>

            <div className="col-6">
                <div className="h-100">
                    <DataManager
                        onExport={handleExport}
                        onImport={handleFileSelect}
                        exporting={exporting}
                        importing={importing}
                        error={error}
                        importResult={importResult}
                    />
                </div>
            </div>
        </div>
    )
}

export default Settings
