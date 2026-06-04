import React, { useState, useRef, useEffect } from 'react'
import { saveComments, saveMessages } from '../../service/jobService'
import { composeRequest } from '../../service/jobAi'
import MessageModal from './MessageModal'
import MessagesList from './MessagesList'
import ComposedEmailModal from './ComposedEmailModal'

export const getRateRowStyle = (rate) => {
    if (rate === null || rate === undefined) {
        return { backgroundColor: 'rgba(200, 200, 200, 0.2)' }
    }
    const color = getRateColor(rate)
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
    if (match) {
        return { backgroundColor: `rgba(${match[1]}, ${match[2]}, ${match[3]}, 0.25)` }
    }
    return {}
}

export const getRateColor = (rate) => {
    if (rate === null || rate === undefined) return '#ccc'

    const value = Math.max(1, Math.min(10, rate))

    if (value <= 5) {
        const ratio = (value - 1) / 4
        const r = Math.round(220 + (255 - 220) * ratio)
        const g = Math.round(53 + (193 - 53) * ratio)
        const b = Math.round(69 + (7 - 69) * ratio)
        return `rgb(${r}, ${g}, ${b})`
    } else {
        const ratio = (value - 5) / 5
        const r = Math.round(255 + (40 - 255) * ratio)
        const g = Math.round(193 + (167 - 193) * ratio)
        const b = Math.round(7 + (69 - 7) * ratio)
        return `rgb(${r}, ${g}, ${b})`
    }
}

export const RateCircle = ({ value, title }) => (
    <div
        title={`${title}: ${value ?? 'N/A'}`}
        style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            backgroundColor: getRateColor(value),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 'bold',
            color: value && value > 5 ? '#fff' : '#333',
            cursor: 'help',
        }}
    >
        {value ?? '–'}
    </div>
)

export const rateFields = [
    { key: 'rateProfLevel', explainKey: 'profLevel', label: 'Level', title: 'Professional Level (Junior/Middle/Senior)' },
    { key: 'rateSkills', explainKey: 'skills', label: 'Skills', title: 'Tech Stack Fit' },
    { key: 'rateCompanyType', explainKey: 'companyType', label: 'Type', title: 'Company Type (Product/Outsource)' },
    { key: 'rateSalary', explainKey: 'salary', label: 'Salary', title: 'Salary Fit' },
    { key: 'rateExpectations', explainKey: 'expectations', label: 'Expect', title: 'Expectations (AI/Blockchain)' },
    { key: 'rate', explainKey: 'total', label: 'Total', title: 'Overall Rating' },
]

export const rateFieldsShort = rateFields.filter(f => f.key !== 'rate')

export const RateLabels = ({ job }) => (
    <div className="d-flex flex-wrap gap-1 pt-2">
        {rateFieldsShort.map(f => (
            <span
                key={f.key}
                className="badge"
                title={job.ratesExplain?.[f.explainKey] || f.title}
                style={{
                    backgroundColor: getRateColor(job[f.key]),
                    color: job[f.key] && job[f.key] > 5 ? '#fff' : '#333',
                    fontSize: '10px',
                    fontWeight: 'normal',
                    padding: '2px 5px',
                }}
            >
                {f.label}
            </span>
        ))}
    </div>
)

const formatRate = (value) => {
    if (value === null || value === undefined) return '–'
    return Number(value).toFixed(1)
}

export const RateOverall = ({ value }) => (
    <div
        title={`Overall: ${value !== null && value !== undefined ? formatRate(value) : 'N/A'}`}
        style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            backgroundColor: getRateColor(value),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 'bold',
            color: value && value > 5 ? '#fff' : '#333',
            cursor: 'help',
        }}
    >
        {formatRate(value)}
    </div>
)

export const JobRateTable = ({ job }) => job.rate !== null && job.rate !== undefined && (
    <table className="fs-6 mb-2 w-100 rounded overflow-hidden">
        <tbody>
            {rateFields.map(f => (
                <tr key={f.key} style={{ backgroundColor: getRateColor(job[f.key]) }}>
                    <td className="px-3 py-1"><small>{f.title}</small></td>
                    <td className="px-3 py-1 fw-bold">
                        <small>{f.key === 'rate' ? formatRate(job[f.key]) : (job[f.key] ?? '–')}</small>
                    </td>
                    <td className="px-3 py-1"><small>{job.ratesExplain?.[f.explainKey] || '–'}</small></td>
                </tr>
            ))}
        </tbody>
    </table>
)

export const JobDetails = ({ job, onJobUpdate }) => {
    const [comments, setComments] = useState(job.comments || '')
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [showMessageModal, setShowMessageModal] = useState(false)
    const [editingMessage, setEditingMessage] = useState(null)
    const [messagesHeight, setMessagesHeight] = useState(500)
    const [showEmailModal, setShowEmailModal] = useState(false)
    const [composedEmail, setComposedEmail] = useState(null)
    const [composingEmail, setComposingEmail] = useState(false)
    const [composeError, setComposeError] = useState(null)
    const descriptionRef = useRef(null)

    const handleSave = async () => {
        setSaving(true)
        setSaved(false)
        try {
            const { job: updatedJob } = await saveComments(job.hash, comments)
            if (updatedJob) {
                setSaved(true)
                onJobUpdate?.(updatedJob)
                setTimeout(() => setSaved(false), 2000)
            }
        } catch (e) {
            console.error('Failed to save comments:', e)
        } finally {
            setSaving(false)
        }
    }

    const handleAddMessage = async (message, editMessage = null) => {
        const currentMessages = job.messages || []

        let updatedMessages
        if (editMessage) {
            updatedMessages = currentMessages.map(msg =>
                msg.timestamp === editMessage.timestamp ? message : msg
            )
        } else {
            updatedMessages = [...currentMessages, message]
        }

        const { job: updatedJob } = await saveMessages(job.hash, updatedMessages)
        if (updatedJob) {
            onJobUpdate?.(updatedJob)
        }
    }

    const handleEditMessage = (message) => {
        setEditingMessage(message)
        setShowMessageModal(true)
    }

    const handleDeleteMessage = async (messageToDelete) => {
        if (!confirm('Delete this message?')) return

        const currentMessages = job.messages || []
        const updatedMessages = currentMessages.filter(msg => msg.timestamp !== messageToDelete.timestamp)

        const { job: updatedJob } = await saveMessages(job.hash, updatedMessages)
        if (updatedJob) {
            onJobUpdate?.(updatedJob)
        }
    }

    const handleModalClose = () => {
        setShowMessageModal(false)
        setEditingMessage(null)
    }

    useEffect(() => {
        if (descriptionRef.current && job.messages && job.messages.length > 0) {
            const leftBlockHeight = descriptionRef.current.offsetHeight
            // Максимальна висота 500px, але якщо лівий блок вищий - використовуємо його висоту
            const maxHeight = Math.max(500, leftBlockHeight)
            setMessagesHeight(maxHeight)
        }
    }, [job.description, job.messages])

    const handleComposeRequest = async () => {
        setComposingEmail(true)
        setComposeError(null)
        setComposedEmail(null)
        setShowEmailModal(true)

        try {
            const { success, email, error } = await composeRequest(job)

            if (success) {
                setComposedEmail(email)
            } else {
                setComposeError(error || 'Failed to compose email')
            }
        } catch (e) {
            console.error('Failed to compose request:', e)
            setComposeError('Failed to compose email')
        } finally {
            setComposingEmail(false)
        }
    }

    const handleCloseEmailModal = () => {
        setShowEmailModal(false)
        setComposedEmail(null)
        setComposeError(null)
        setComposingEmail(false)
    }


    const hasChanges = comments !== (job.comments || '')

    return (
        <div className="p-2">
            <div className="row">
                <div className="col-6">
                    <div className="mb-2">
                        <textarea
                            className="form-control form-control-sm"
                            rows={9}
                            placeholder="Comments..."
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                        />
                    </div>
                    <button
                        className={`btn btn-sm w-100 ${saved ? 'btn-success' : 'btn-outline-success'}`}
                        onClick={handleSave}
                        disabled={saving || !hasChanges}
                    >
                        {saving ? 'Saving...' : saved ? 'Saved' : 'Save'}
                    </button>
                </div>
                <div className="col-6">
                    <JobRateTable job={job} />
                    {job.href && (
                        <div className="row mb-2">
                            <div className="col-9">
                                <small className="d-block">
                                    <a href={job.href} target="_blank" rel="noopener noreferrer" className="text-primary text-break">
                                        {job.href}
                                    </a>
                                </small>
                            </div>
                            <div className="col-3 d-flex justify-content-end gap-1">
                                <button
                                    className="btn btn-outline-primary btn-sm mt-1"
                                    onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        setShowMessageModal(true)
                                    }}
                                >
                                    Add Message
                                </button>
                                <button
                                    className="btn btn-outline-secondary btn-sm mt-1 ms-2"
                                    onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        handleComposeRequest()
                                    }}
                                    disabled={composingEmail}
                                >
                                    {composingEmail ? 'Composing...' : 'Compose Request'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {job.description && (
                <div className={`row mt-2 ${job.messages && job.messages.length > 0 ? '' : ''}`}>
                    <div className={job.messages && job.messages.length > 0 ? 'col-7' : 'col-12'}>
                        <div className="p-2 bg-light rounded small">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <small className="text-muted">Job Description</small>
                                <button
                                    className="btn btn-outline-secondary btn-sm"
                                    onClick={async () => {
                                        try {
                                            // Extract text from HTML
                                            const tempDiv = document.createElement('div')
                                            tempDiv.innerHTML = job.description
                                            const plainText = tempDiv.textContent || tempDiv.innerText || ''
    
                                            // Copy to clipboard
                                            await navigator.clipboard.writeText(plainText)
    
                                            // Visual feedback
                                            const btn = document.activeElement
                                            const originalText = btn.textContent
                                            btn.textContent = 'Copied!'
                                            btn.className = 'btn btn-success btn-sm'
                                            setTimeout(() => {
                                                btn.textContent = originalText
                                                btn.className = 'btn btn-outline-secondary btn-sm'
                                            }, 1000)
                                        } catch (err) {
                                            console.error('Failed to copy text: ', err)
                                        }
                                    }}
                                    title="Copy description as plain text"
                                >
                                    Copy Text
                                </button>
                            </div>
                            <div
                                ref={descriptionRef}
                                dangerouslySetInnerHTML={{ __html: job.description }}
                            />
                        </div>
                    </div>
                    {job.messages && job.messages.length > 0 && (
                        <div className="col-5">
                            <MessagesList
                                messages={job.messages}
                                onEditMessage={handleEditMessage}
                                onDeleteMessage={handleDeleteMessage}
                                maxHeight={messagesHeight}
                            />
                        </div>
                    )}
                </div>
            )}

            <MessageModal
                isOpen={showMessageModal}
                onClose={handleModalClose}
                onAddMessage={handleAddMessage}
                editMessage={editingMessage}
            />

            <ComposedEmailModal
                isOpen={showEmailModal}
                onClose={handleCloseEmailModal}
                email={composedEmail}
                isLoading={composingEmail}
                error={composeError}
            />
        </div>
    )
}

export const PromptEditor = ({
    title,
    label,
    value,
    loading,
    saving,
    saved,
    onChange,
    onSave,
    placeholder,
    rows = 25,
    helpText
}) => {
    return (
        <div className="card">
            <div className="card-header">
                <h5 className="mb-0">{title}</h5>
            </div>
            <div className="card-body">
                <div className="mb-3">
                    <label className="form-label">{label}</label>
                    {loading ? (
                        <div className="text-muted">Loading...</div>
                    ) : (
                        <textarea
                            className="form-control"
                            rows={rows}
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            placeholder={placeholder}
                            style={{ fontFamily: 'monospace', fontSize: '12px' }}
                        />
                    )}
                    {helpText && (
                        <div className="form-text">
                            {helpText}
                        </div>
                    )}
                </div>
                <div className="d-flex align-items-center gap-2">
                    <button
                        className="btn btn-primary"
                        onClick={onSave}
                        disabled={saving || loading}
                    >
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                    {saved && (
                        <span className="text-success">Saved!</span>
                    )}
                </div>
            </div>
        </div>
    )
}

export const DataManager = ({
                                onExport,
                                onImport,
                                exporting,
                                importing,
                                error,
                                importResult
                            }) => {
    const fileInputRef = useRef(null)

    const handleImportClick = () => {
        fileInputRef.current?.click()
    }

    return (
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
                        onClick={onExport}
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
                        onChange={onImport}
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
    )
}
