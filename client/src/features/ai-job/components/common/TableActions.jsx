import React from 'react'

export const ACTION_TYPES = {
    AI: 'ai',
    EDIT: 'edit',
    FAVORITE: 'favorite',
    CONTACTED: 'contacted',
    HIDE: 'hide',
    SHOW: 'show',
    REMOVE: 'remove',
}

const actionConfig = {
    [ACTION_TYPES.AI]: {
        label: 'AI',
        className: 'btn-outline-primary',
        title: 'Analyze with AI',
    },
    [ACTION_TYPES.EDIT]: {
        label: '✏️',
        className: 'btn-outline-secondary',
        title: 'Edit job',
    },
    [ACTION_TYPES.FAVORITE]: {
        label: '★',
        labelActive: '★',
        className: 'btn-outline-warning',
        classNameActive: 'btn-warning',
        title: 'Add to favorites',
        titleActive: 'Remove from favorites',
        toggle: 'favorite',
    },
    [ACTION_TYPES.CONTACTED]: {
        label: '✉',
        labelActive: '✉',
        className: 'btn-outline-info',
        classNameActive: 'btn-info',
        title: 'Mark as contacted',
        titleActive: 'Unmark contacted',
        toggle: 'contacted',
    },
    [ACTION_TYPES.HIDE]: {
        label: '⊘',
        className: 'btn-outline-secondary',
        title: 'Hide job',
        toggle: 'hidden',
        toggleValue: true,
    },
    [ACTION_TYPES.SHOW]: {
        label: '↩',
        className: 'btn-outline-success',
        title: 'Restore job',
        toggle: 'hidden',
        toggleValue: false,
    },
    [ACTION_TYPES.REMOVE]: {
        label: '×',
        className: 'btn-outline-danger',
        title: 'Delete permanently',
    },
}

const TableActions = ({
    job,
    actions = [],
    onAction,
    analyzingJob = null,
    onToggleDetails,
    isExpanded = false,
}) => {
    const handleAction = (actionType) => {
        if (onAction) {
            onAction(actionType, job)
        }
    }

    return (
        <div className="d-flex justify-content-end align-items-center gap-1">
            <div className="btn-group btn-group-sm">
                {actions.map(actionType => {
                    const config = actionConfig[actionType]
                    if (!config) return null

                    const isActive = config.toggle && job[config.toggle]
                    const isLoading = actionType === ACTION_TYPES.AI && analyzingJob === job.hash

                    return (
                        <button
                            key={actionType}
                            className={`btn ${isActive ? (config.classNameActive || config.className) : config.className}`}
                            onClick={() => handleAction(actionType)}
                            disabled={isLoading}
                            title={isActive ? (config.titleActive || config.title) : config.title}
                        >
                            {isLoading ? (
                                <span className="spinner-border spinner-border-sm"
                                      style={{height: '13px', width: '13px'}}
                                      role="status" aria-hidden="true"
                                ></span>
                            ) : (
                                isActive ? (config.labelActive || config.label) : config.label
                            )}
                        </button>
                    )
                })}
            </div>

            {onToggleDetails && (
                <button
                    className="btn btn-empty"
                    onClick={() => onToggleDetails(job.hash)}
                    title="Toggle details"
                >
                    {isExpanded ? '▲' : '▼'}
                </button>
            )}
        </div>
    )
}

export default TableActions
