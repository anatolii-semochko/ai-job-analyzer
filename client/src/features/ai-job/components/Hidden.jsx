import React from 'react'
import JobList from './common/JobList'
import { ACTION_TYPES } from './common/TableActions'

const Hidden = ({ onUpdate, selectedItems, onSelectionChange }) => {
    const filterFn = (job) => job.hidden || job.refused

    const actions = [
        ACTION_TYPES.SHOW,
        ACTION_TYPES.REMOVE,
    ]

    return (
        <JobList
            title="Hidden"
            filterFn={filterFn}
            actions={actions}
            defaultSortBy="dateAdd"
            defaultSortOrder="desc"
            emptyMessage="No hidden jobs"
            onUpdate={onUpdate}
            selectedItems={selectedItems}
            onSelectionChange={onSelectionChange}
        />
    )
}

export default Hidden
