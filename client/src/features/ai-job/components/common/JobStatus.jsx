import React, { useState } from 'react'
import { updateJobData } from '../../service/jobService'
import { getDaysAgo } from '../../utils/dateUtils'

const STATUS_OPTIONS = {
    'Interesting': { color: '#28a745', bg: '#d4edda' },
    'Observing': { color: '#007bff', bg: '#d1ecf1' },
    'Requested': { color: '#fd7e14', bg: '#ffeaa7' },
    'Waiting answer': { color: '#6f42c1', bg: '#e7d6f7' },
    'Negotiations': { color: '#3945ed', bg: '#7afa00' },
    'Interview': { color: '#ff0000', bg: '#7afa00' },
    'Deactivated': { color: '#6c757d', bg: '#e9ecef' },
    'Refused': { color: '#dc3545', bg: '#f8d7da' }
}

const JobStatus = ({ job, onJobUpdate }) => {
    const [isEditing, setIsEditing] = useState(false)
    const [currentStatus, setCurrentStatus] = useState(job.status || '')

    const handleStatusChange = async (newStatus) => {
        try {
            const now = new Date().toISOString().split('T')[0] // Дата без часу (YYYY-MM-DD)
            const updatedJob = await updateJobData({
                ...job,
                status: newStatus,
                statusDate: now
            })
            setCurrentStatus(newStatus)
            onJobUpdate?.(updatedJob)
            setIsEditing(false)
        } catch (e) {
            console.error('Failed to update status:', e)
        }
    }

    const handleClickOutside = () => {
        setIsEditing(false)
    }

    if (isEditing) {
        return (
            <select
                className="form-select form-select-sm"
                value={currentStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                onBlur={handleClickOutside}
                autoFocus
                style={{ minWidth: '120px' }}
            >
                <option value="">–</option>
                {Object.keys(STATUS_OPTIONS).map(status => (
                    <option key={status} value={status}>{status}</option>
                ))}
            </select>
        )
    }

    const statusConfig = currentStatus ? STATUS_OPTIONS[currentStatus] : null
    const daysAgo = getDaysAgo(job.statusDate)

    const dateCell = (job) => {
        const dateAdded = getDaysAgo(job.datePublish || job.dateAdd);
        let sting  = dateAdded ? `${dateAdded}d` : '–';

        if (daysAgo !== null && currentStatus) {
            sting += daysAgo === 0 ? ' / today' : ` / ${daysAgo}d`;
        }
        
        return sting;
    }

    return (
        <div
            onClick={() => setIsEditing(true)}
            style={{cursor: 'pointer'}}
            title="Click to change status"
        >
            <span
                style={{
                    padding: '2px 6px',
                    borderRadius: '3px',
                    fontSize: '11px',
                    fontWeight: '500',
                    color: statusConfig?.color || '#6c757d',
                    backgroundColor: statusConfig?.bg || 'transparent',
                    border: statusConfig ? `1px solid ${statusConfig.color}30` : '1px solid transparent',
                    whiteSpace: 'nowrap', 
                }}
            >
                {currentStatus || '–'}
            </span>
            <br/>
            <small style={{ color: '#6c757d', fontSize: '9px', marginTop: '1px' }}>
                {dateCell(job)}
            </small>
        </div>
    )
}

export default JobStatus