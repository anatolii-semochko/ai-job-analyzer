import React, { useState, useEffect } from 'react'
import { fetch as fetchJobs } from '../../service/jobService'
import { useJobActions } from '../../hooks/useJobActions'
import { useJobFilters } from '../../hooks/useJobFilters'
import Table from './Table'
import TableFilter from './TableFilter'
import AddJobModal from './AddJobModal'

const JobList = ({
    title,
    filterFn,
    actions,
    defaultSortBy = 'rate',
    defaultSortOrder = 'desc',
    emptyMessage,
    onUpdate,
    showAddButton = false,
    showBatchAnalyze = false,
}) => {
    const [jobs, setJobs] = useState([])
    const [loading, setLoading] = useState(true)
    const [sortBy, setSortBy] = useState(defaultSortBy)
    const [sortOrder, setSortOrder] = useState(defaultSortOrder)
    const [showAddModal, setShowAddModal] = useState(false)

    const {
        analyzingJob,
        batchAnalyzing,
        batchProgress,
        handleAction,
        handleBatchAnalyze,
    } = useJobActions(jobs, setJobs, onUpdate)

    const {
        filterOptions,
        filters,
        handleFilterChange,
        handleResetFilters,
        applyFilters,
        refreshFilterOptions,
    } = useJobFilters()

    const loadJobs = async () => {
        setLoading(true)
        try {
            const data = await fetchJobs({ sortBy, sortOrder })
            let filtered = filterFn ? data.filter(filterFn) : data
            filtered = applyFilters(filtered)
            setJobs(filtered)
        } catch (e) {
            console.error('Failed to load jobs:', e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadJobs()
    }, [sortBy, sortOrder, filters])

    const unanalyzedJobs = showBatchAnalyze ? jobs.filter(j => j.rate === null || j.rate === undefined) : []

    const handleAddJob = () => {
        setShowAddModal(true)
    }

    const handleJobAdded = async (newJob) => {
        await refreshFilterOptions()
        await loadJobs()
        onUpdate?.()
    }

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">{title} ({jobs.length})</h5>
                <TableFilter
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSortByChange={setSortBy}
                    onSortOrderChange={setSortOrder}
                    onRefresh={loadJobs}
                    filterOptions={filterOptions}
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onReset={handleResetFilters}
                    onAddJob={showAddButton ? handleAddJob : undefined}
                >
                    {showBatchAnalyze && unanalyzedJobs.length > 0 && (
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleBatchAnalyze(unanalyzedJobs)}
                            disabled={batchAnalyzing}
                            title={`Analyze ${unanalyzedJobs.length} unanalyzed jobs`}
                        >
                            {batchAnalyzing
                                ? `Analyzing ${batchProgress.current}/${batchProgress.total}...`
                                : `Analyze (${unanalyzedJobs.length})`
                            }
                        </button>
                    )}
                </TableFilter>
            </div>

            {loading ? (
                <p className="text-muted">Loading...</p>
            ) : (
                <Table
                    jobs={jobs}
                    actions={actions}
                    onAction={handleAction}
                    onJobUpdate={(updatedJob) => setJobs(jobs.map(j => j.hash === updatedJob.hash ? updatedJob : j))}
                    analyzingJob={analyzingJob}
                    emptyMessage={emptyMessage}
                />
            )}

            {showAddButton && (
                <AddJobModal
                    isOpen={showAddModal}
                    onClose={() => setShowAddModal(false)}
                    onJobAdded={handleJobAdded}
                    filterOptions={filterOptions}
                />
            )}
        </div>
    )
}

export default JobList