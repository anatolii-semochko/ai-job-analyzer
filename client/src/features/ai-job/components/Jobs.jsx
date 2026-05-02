import React from 'react'
import JobList from './common/JobList'
import { ACTION_TYPES } from './common/TableActions'

const Jobs = ({ onUpdate }) => {
    const filterFn = (job) => !job.favorite && !job.contacted && !job.hidden && !job.refused

    const actions = [
        ACTION_TYPES.AI,
        ACTION_TYPES.FAVORITE,
        ACTION_TYPES.CONTACTED,
        ACTION_TYPES.HIDE,
        ACTION_TYPES.REMOVE,
    ]

    return (
        <JobList
            title="Jobs"
            filterFn={filterFn}
            actions={actions}
            defaultSortBy="rate"
            defaultSortOrder="desc"
            emptyMessage="No new jobs in database"
            onUpdate={onUpdate}
            showAddButton={true}
            showBatchAnalyze={true}
        />
    )
}

export default Jobs
