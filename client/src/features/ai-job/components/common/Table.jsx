import React, { useState } from 'react'
import { JobDetails, RateLabels, RateOverall } from './Components'
import TableActions from './TableActions'

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
}) => {
    const [expandedJob, setExpandedJob] = useState(null)

    const toggleExpand = (hash) => {
        setExpandedJob(expandedJob === hash ? null : hash)
    }

    if (jobs.length === 0) {
        return <p className="text-muted">{emptyMessage}</p>
    }

    return (
        <table className="table table-hover table-sm" style={{ fontSize: '13px' }}>
            <thead className="table-light">
                <tr>
                    <th>Position</th>
                    <th>Company</th>
                    <th>Salary</th>
                    <th>Rates</th>
                    <th style={{ textAlign: 'center' }}>Score</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
            </thead>
            <tbody>
                {jobs.map((job) => (
                    <React.Fragment key={job.hash}>
                        <tr>
                            <td>
                                <strong>{job.title}</strong>
                                <br />
                                <span className="badge bg-secondary" style={{ fontSize: '9px' }}>
                                    {job.parser}
                                </span>
                            </td>

                            <td>
                                <strong>{job.company || 'N/A'}</strong>
                                <br />
                                <span className="text-muted small">{job.country || 'N/A'}</span>
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
                                <td colSpan="6" className="bg-light">
                                    <JobDetails job={job} onJobUpdate={onJobUpdate} />
                                </td>
                            </tr>
                        )}
                    </React.Fragment>
                ))}
            </tbody>
        </table>
    )
}

export default Table
