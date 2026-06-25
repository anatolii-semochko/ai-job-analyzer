import React, { useState, useEffect, useRef } from 'react'
import { saveGeneratedData } from '../../service/jobService'
import { generateApplyData } from '../../service/jobAi'
import { sanitizeForCopy, joinList, splitList } from '../../utils/textUtils'

const emptyFormData = {
    stack: [],
    titleA: '',
    titleB: '',
    titleStackText: '',
    professionalSummary: '',
    coreCompetencies: [],
    technicalStack: '',
    coverLetter: '',
    whyCompanyLetter: '',
}

const toFormData = (generatedData) => {
    const data = generatedData || {}
    return {
        stack: Array.isArray(data.stack) ? data.stack : [],
        titleA: data.title?.[0] || '',
        titleB: data.title?.[1] || '',
        titleStackText: joinList(data.titleStack),
        professionalSummary: data.professionalSummary || '',
        coreCompetencies: Array.isArray(data.coreCompetencies) ? data.coreCompetencies.filter(Boolean).join("\n") : [],
        technicalStack: data.technicalStack || '',
        coverLetter: data.coverLetter || '',
        whyCompanyLetter: data.whyCompanyLetter || '',
    }
}

const toGeneratedData = (formData) => ({
    stack: formData.stack,
    title: [formData.titleA, formData.titleB],
    titleStack: splitList(formData.titleStackText),
    professionalSummary: formData.professionalSummary,
    coreCompetencies: formData.coreCompetencies.split('\n'),
    technicalStack: formData.technicalStack,
    coverLetter: formData.coverLetter,
    whyCompanyLetter: formData.whyCompanyLetter,
})

const CopyButton = ({ text }) => {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(sanitizeForCopy(text))
            setCopied(true)
            setTimeout(() => setCopied(false), 1200)
        } catch (e) {
            console.error('Failed to copy text:', e)
        }
    }

    return (
        <button
            type="button"
            className={`btn btn-sm ${copied ? 'btn-success' : 'btn-outline-secondary'}`}
            style={{ padding: '2px 8px' }}
            onClick={handleCopy}
            title="Copy to buffer"
        >
            {copied ? '✓' : '📋'}
        </button>
    )
}

const AutoTextarea = ({ value, onChange, ...props }) => {
    const ref = useRef(null)

    useEffect(() => {
        const el = ref.current
        if (!el) return
        el.style.height = 'auto'
        el.style.height = `${el.scrollHeight}px`
    }, [value])

    return (
        <textarea
            ref={ref}
            className="form-control"
            style={{ overflow: 'hidden', resize: 'none' }}
            value={value}
            onChange={onChange}
            {...props}
        />
    )
}

const FieldHeader = ({ label, copyText }) => (
    <div className="d-flex justify-content-between align-items-center mb-1">
        <label className="form-label fw-bold mb-0">{label}</label>
        <CopyButton text={copyText} />
    </div>
)

const ApplyDataModal = ({ isOpen, job, onClose, onJobUpdate }) => {
    const [formData, setFormData] = useState(emptyFormData)
    const [generating, setGenerating] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (isOpen) {
            setFormData(toFormData(job?.generatedData))
            setError(null)
        }
    }, [isOpen, job])

    if (!isOpen) return null

    const handleSave = async () => {
        setSaving(true)
        setError(null)
        try {
            const generatedData = toGeneratedData(formData)
            const { job: updatedJob, action } = await saveGeneratedData(job.hash, generatedData)

            if (action === 'not_found') {
                setError('Job not found in database')
                return
            }

            onJobUpdate?.(updatedJob)
            onClose()
        } catch (e) {
            console.error('Failed to save generated data:', e)
            setError('Failed to save data')
        } finally {
            setSaving(false)
        }
    }

    const handleGenerate = async () => {
        setGenerating(true)
        setError(null)
        try {
            const { success, generatedData, error: genError } = await generateApplyData(job)

            if (!success) {
                setError(genError || 'Failed to generate data')
                return
            }

            const { job: updatedJob, action } = await saveGeneratedData(job.hash, generatedData)

            if (action === 'not_found') {
                setError('Job not found in database')
                return
            }

            onJobUpdate?.(updatedJob)
            setFormData(toFormData(generatedData))
        } catch (e) {
            console.error('Failed to generate apply data:', e)
            setError('Failed to generate data')
        } finally {
            setGenerating(false)
        }
    }

    const handleCancel = () => {
        onClose()
    }

    const busy = generating || saving

    return (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable" style={{ maxWidth: '95vw', width: '95vw' }}>
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Compose Request</h5>
                        <button type="button" className="btn-close" onClick={handleCancel}></button>
                    </div>
                    <div className="modal-body">
                        {error && (
                            <div className="alert alert-danger">
                                <strong>Error:</strong> {error}
                            </div>
                        )}

                        <div className="mb-3">
                            <FieldHeader label="Tech Stack" copyText={joinList(formData.stack)} />
                            <div className="form-control-plaintext bg-light rounded px-2 py-1 small">
                                {joinList(formData.stack) || '—'}
                            </div>
                        </div>

                        <div className="row mb-3">
                            <div className="col-6">
                                <FieldHeader label="CV Title (from list)" copyText={formData.titleA} />
                                <input
                                    type="text"
                                    className="form-control"
                                    value={formData.titleA}
                                    onChange={(e) => setFormData({ ...formData, titleA: e.target.value })}
                                />
                            </div>
                            <div className="col-6">
                                <FieldHeader label="CV Title (AI proposal)" copyText={formData.titleB} />
                                <input
                                    type="text"
                                    className="form-control"
                                    value={formData.titleB}
                                    onChange={(e) => setFormData({ ...formData, titleB: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="mb-3">
                            <FieldHeader label="CV Title Stack" copyText={formData.titleStackText} />
                            <input
                                type="text"
                                className="form-control"
                                value={formData.titleStackText}
                                onChange={(e) => setFormData({ ...formData, titleStackText: e.target.value })}
                            />
                        </div>

                        <div className="mb-3">
                            <FieldHeader label="Professional Summary" copyText={formData.professionalSummary} />
                            <AutoTextarea
                                value={formData.professionalSummary}
                                onChange={(e) => setFormData({ ...formData, professionalSummary: e.target.value })}
                            />
                        </div>

                        <div className="mb-3">
                            <FieldHeader label="Core Competencies" copyText={formData.coreCompetencies} />
                            <AutoTextarea
                                value={formData.coreCompetencies}
                                onChange={(e) => setFormData({ ...formData, coreCompetencies: e.target.value })}
                            />
                        </div>

                        <div className="mb-3">
                            <FieldHeader label="Technical Stack" copyText={formData.technicalStack} />
                            <AutoTextarea
                                value={formData.technicalStack}
                                onChange={(e) => setFormData({ ...formData, technicalStack: e.target.value })}
                            />
                        </div>

                        <div className="mb-3">
                            <FieldHeader label="Cover Letter" copyText={formData.coverLetter} />
                            <AutoTextarea
                                value={formData.coverLetter}
                                onChange={(e) => setFormData({ ...formData, coverLetter: e.target.value })}
                            />
                        </div>

                        <div className="mb-3">
                            <FieldHeader label="Why this company and this position" copyText={formData.whyCompanyLetter} />
                            <AutoTextarea
                                value={formData.whyCompanyLetter}
                                onChange={(e) => setFormData({ ...formData, whyCompanyLetter: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={handleCancel} disabled={busy}>
                            Cancel
                        </button>
                        <button type="button" className="btn btn-outline-primary" onClick={handleGenerate} disabled={busy}>
                            {generating ? 'Generating...' : 'Generate'}
                        </button>
                        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={busy}>
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ApplyDataModal
