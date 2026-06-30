import React from 'react'
import JobList from './common/JobList'
import { ACTION_TYPES } from './common/TableActions'

const Refused = ({ onUpdate, selectedItems, onSelectionChange }) => {
    const filterFn = (job) => job.status === 'Refused'

    const actions = [
        ACTION_TYPES.EDIT,
        ACTION_TYPES.SHOW,
        ACTION_TYPES.REMOVE,
    ]

    return (
        <JobList
            title="Refused"
            filterFn={filterFn}
            actions={actions}
            defaultSortBy="dateAdd"
            defaultSortOrder="desc"
            emptyMessage="No refused jobs"
            onUpdate={onUpdate}
            showAddButton={false}
            selectedItems={selectedItems}
            onSelectionChange={onSelectionChange}
        />
    )
}

export default Refused
