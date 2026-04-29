import React, { useState } from 'react'
import { saveComments } from '../../service/jobService'

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
    <table className="fs-6 mb-2">
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
                        <div className="mb-2">
                            <a href={job.href} target="_blank" rel="noopener noreferrer" className="text-primary text-break">
                                {job.href}
                            </a>
                        </div>
                    )}
                </div>
            </div>

            {job.description && (
                <div
                    className="p-2 bg-light rounded small mt-2"
                    dangerouslySetInnerHTML={{ __html: job.description }}
                />
            )}
        </div>
    )
}
