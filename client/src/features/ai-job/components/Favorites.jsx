import React from 'react'
import JobList from './common/JobList'
import { ACTION_TYPES } from './common/TableActions'

const Favorites = ({ onUpdate, selectedItems, onSelectionChange }) => {
    const filterFn = (job) => job.favorite && !job.contacted && !job.hidden && !job.refused

    const actions = [
        ACTION_TYPES.AI,
        ACTION_TYPES.FAVORITE,
        ACTION_TYPES.CONTACTED,
        ACTION_TYPES.HIDE,
    ]

    return (
        <JobList
            title="Favorites"
            filterFn={filterFn}
            actions={actions}
            defaultSortBy="rate"
            defaultSortOrder="desc"
            emptyMessage="No favorite jobs"
            onUpdate={onUpdate}
            showBatchAnalyze={true}
            selectedItems={selectedItems}
            onSelectionChange={onSelectionChange}
        />
    )
}

export default Favorites
