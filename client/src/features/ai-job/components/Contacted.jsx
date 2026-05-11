import React from 'react'
import JobList from './common/JobList'
import { ACTION_TYPES } from './common/TableActions'

const Contacted = ({ onUpdate, selectedItems, onSelectionChange }) => {
    const filterFn = (job) => job.contacted && !job.hidden && !job.refused

    const actions = [
        ACTION_TYPES.AI,
        ACTION_TYPES.EDIT,
        ACTION_TYPES.FAVORITE,
        ACTION_TYPES.HIDE,
    ]

    return (
        <JobList
            title="Contacted"
            filterFn={filterFn}
            actions={actions}
            defaultSortBy="rate"
            defaultSortOrder="desc"
            emptyMessage="No contacted jobs"
            onUpdate={onUpdate}
            showAddButton={true}
            showBatchAnalyze={true}
            selectedItems={selectedItems}
            onSelectionChange={onSelectionChange}
        />
    )
}

export default Contacted
