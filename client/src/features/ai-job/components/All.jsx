import React from 'react'
import JobList from './common/JobList'
import { ACTION_TYPES } from './common/TableActions'

const All = ({ onUpdate, selectedItems, onSelectionChange }) => {
    const filterFn = (job) => job

    const actions = [
        ACTION_TYPES.AI,
        ACTION_TYPES.EDIT,
        ACTION_TYPES.FAVORITE,
        ACTION_TYPES.CONTACTED,
        ACTION_TYPES.HIDE,
        ACTION_TYPES.REMOVE,
    ]

    return (
        <JobList
            title="All"
            filterFn={filterFn}
            actions={actions}
            defaultSortBy="dateAdd"
            defaultSortOrder="desc"
            emptyMessage="No jobs"
            onUpdate={onUpdate}
            showAddButton={true}
            showBatchAnalyze={true}
            selectedItems={selectedItems}
            onSelectionChange={onSelectionChange}
        />
    )
}

export default All
