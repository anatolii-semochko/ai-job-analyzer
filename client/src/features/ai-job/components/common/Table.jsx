import React, { useState } from 'react'
import { JobDetails, RateLabels, RateOverall } from './Components'
import TableActions from './TableActions'
import JobStatus from './JobStatus'

const getDaysAgo = (dateStr) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    const now = new Date()
    const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24))
    return diff
}

const Table = ({
    jobs = [],
    actions = [],
    onAction,
    onJobUpdate,
    analyzingJob = null,
    emptyMessage = 'No jobs found',
    selectedItems = [],
    onSelectionChange,
}) => {
    const [expandedJob, setExpandedJob] = useState(null)

    const toggleExpand = (hash) => {
        setExpandedJob(expandedJob === hash ? null : hash)
    }

    const isAllSelected = jobs.length > 0 && selectedItems.length > 0
    const isIndeterminate = selectedItems.length > 0 && selectedItems.length < jobs.length

    const handleMasterCheckbox = () => {
        if (selectedItems.length > 0) {
            onSelectionChange?.([])
        } else {
            const allHashes = jobs.map(job => job.hash)
            onSelectionChange?.(allHashes)
        }
    }

    const handleItemCheckbox = (hash) => {
        const newSelection = selectedItems.includes(hash)
            ? selectedItems.filter(h => h !== hash)
            : [...selectedItems, hash]
        onSelectionChange?.(newSelection)
    }

    if (jobs.length === 0) {
        return <p className="text-muted">{emptyMessage}</p>
    }

    return (
        <>
            <style>
                {`tr.row-muted td { color: #6c757d !important; }`}
            </style>
            <table className="table table-hover table-sm" style={{ fontSize: '13px' }}>
            <thead className="table-light">
                <tr>
                    <th className="text-center" style={{ width: '30px' }}>
                        <input
                            type="checkbox"
                            className="form-check-input m-0"
                            checked={isAllSelected}
                            ref={(el) => {
                                if (el) el.indeterminate = isIndeterminate
                            }}
                            onChange={handleMasterCheckbox}
                        />
                    </th>
                    <th>Position</th>
                    <th>Company</th>
                    <th>Status</th>
                    <th className="pe-3">Salary</th>
                    <th>Rates</th>
                    <th>Score</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
            </thead>
            <tbody>
                {jobs.map((job) => (
                    <React.Fragment key={job.hash}>
                        <tr className={job.status === 'Deactivated' ? 'row-muted' : ''}>
                            <td className="text-center align-middle">
                                <input
                                    type="checkbox"
                                    className="form-check-input m-0"
                                    checked={selectedItems.includes(job.hash)}
                                    onChange={() => handleItemCheckbox(job.hash)}
                                />
                            </td>
                            <td>
                                <div className="d-flex align-items-center gap-1">
                                    <div>
                                        <strong>
                                            {job.messages && job.messages.length && (
                                                <span className="text-danger me-1" style={{ fontSize: '16px' }}>●</span>
                                            )}
                                            {job.comments && job.comments.trim() && (
                                                <span className="text-warning me-1" style={{ fontSize: '16px' }}>●</span>
                                            )}
                                            {job.title}
                                        </strong>
                                        <br />
                                        <span className="text-muted small">{job.parser}</span>
                                        {job.comments && job.comments.trim() && (
                                            <strong className="text-primary small ms-2">
                                                {job.comments.split('\n')[0]}
                                            </strong>
                                        )}
                                    </div>
                                </div>
                            </td>

                            <td>
                                <strong>{job.company || 'N/A'}</strong>
                                <br />
                                <span className="text-muted small">{job.country || 'N/A'}</span>
                            </td>

                            <td style={{ verticalAlign: 'middle' }}>
                                <JobStatus job={job} onJobUpdate={onJobUpdate} />
                            </td>

                            <td>
                                {job.salary ? (
                                    <span className="text-success fw-bold">${job.salary}</span>
                                ) : (
                                    <span className="text-muted">–</span>
                                )}
                                <br />
                                <span className="text-muted small">
                                    {getDaysAgo(job.datePublish) !== null ? `${getDaysAgo(job.datePublish)}d ago` : '–'}
                                </span>
                            </td>

                            <td>
                                <RateLabels job={job} />
                            </td>

                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                <RateOverall value={job.rate} />
                            </td>

                            <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                                <TableActions
                                    job={job}
                                    actions={actions}
                                    onAction={onAction}
                                    analyzingJob={analyzingJob}
                                    onToggleDetails={toggleExpand}
                                    isExpanded={expandedJob === job.hash}
                                />
                            </td>
                        </tr>

                        {expandedJob === job.hash && (
                            <tr>
                                <td colSpan="8" className="bg-light ">
                                    <JobDetails job={job} onJobUpdate={onJobUpdate} />
                                </td>
                            </tr>
                        )}
                    </React.Fragment>
                    )
                )}
            </tbody>
        </table>
        </>
    )
}

export default Table
