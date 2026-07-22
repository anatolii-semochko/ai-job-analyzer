import React from 'react'
import JobList from './common/JobList'
import { ACTION_TYPES } from './common/TableActions'

const Observing = ({ onUpdate, selectedItems, onSelectionChange }) => {
    const filterFn = (job) => ['Observing'].includes(job.status)

    const actions = [
        ACTION_TYPES.AI,
        ACTION_TYPES.EDIT,
        ACTION_TYPES.FAVORITE,
        ACTION_TYPES.HIDE,
    ]

    return (
        <JobList
            title="Observing"
            filterFn={filterFn}
            actions={actions}
            defaultSortBy="rate"
            defaultSortOrder="desc"
            emptyMessage="No observing jobs"
            onUpdate={onUpdate}
            showAddButton={true}
            showBatchAnalyze={true}
            selectedItems={selectedItems}
            onSelectionChange={onSelectionChange}
        />
    )
}

export default Observing
