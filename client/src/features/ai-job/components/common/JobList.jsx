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
    selectedItems = [],
    onSelectionChange,
}) => {
    const [jobs, setJobs] = useState([])
    const [loading, setLoading] = useState(true)
    const [sortBy, setSortBy] = useState(() => {
        return localStorage.getItem(`aiJob_${title}_sortBy`) || defaultSortBy
    })
    const [sortOrder, setSortOrder] = useState(() => {
        return localStorage.getItem(`aiJob_${title}_sortOrder`) || defaultSortOrder
    })
    const [showAddModal, setShowAddModal] = useState(false)
    const [editingJob, setEditingJob] = useState(null)

    const handleJobProcessed = (jobHash) => {
        onSelectionChange?.(prev => prev.filter(hash => hash !== jobHash))
    }

    const handleEditJob = (job) => {
        setEditingJob(job)
        setShowAddModal(true)
    }

    const {
        analyzingJob,
        batchAnalyzing,
        batchProgress,
        handleAction,
        handleBatchAnalyze,
    } = useJobActions(jobs, setJobs, onUpdate, handleJobProcessed, handleEditJob)

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
            onSelectionChange?.(prev => prev.filter(hash => filtered.some(job => job.hash === hash)))
        } catch (e) {
            console.error('Failed to load jobs:', e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        localStorage.setItem(`aiJob_${title}_sortBy`, sortBy)
        localStorage.setItem(`aiJob_${title}_sortOrder`, sortOrder)
        loadJobs()
    }, [sortBy, sortOrder, filters, title])

    const unanalyzedJobs = showBatchAnalyze ? jobs.filter(j => j.rate === null || j.rate === undefined) : []
    const selectedJobs = jobs.filter(j => selectedItems.includes(j.hash))

    const jobsToAnalyze = selectedItems.length > 0 ? selectedJobs : unanalyzedJobs
    const shouldShowAnalyzeButton = showBatchAnalyze && jobsToAnalyze.length > 0

    const handleAddJob = () => {
        setEditingJob(null)
        setShowAddModal(true)
    }

    const handleCloseModal = () => {
        setShowAddModal(false)
        setEditingJob(null)
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
                    {shouldShowAnalyzeButton && (
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleBatchAnalyze(jobsToAnalyze)}
                            disabled={batchAnalyzing}
                            title={selectedItems.length > 0
                                ? `Analyze ${selectedJobs.length} selected jobs`
                                : `Analyze ${unanalyzedJobs.length} unanalyzed jobs`}
                        >
                            {batchAnalyzing
                                ? `Analyzing ${batchProgress.current}/${batchProgress.total}...`
                                : selectedItems.length > 0
                                    ? `Analyze Selected (${selectedJobs.length})`
                                    : `Analyze Raw (${unanalyzedJobs.length})`
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
                    selectedItems={selectedItems}
                    onSelectionChange={onSelectionChange}
                />
            )}

            {showAddButton && (
                <AddJobModal
                    isOpen={showAddModal}
                    onClose={handleCloseModal}
                    onJobAdded={handleJobAdded}
                    filterOptions={filterOptions}
                    editJob={editingJob}
                />
            )}
        </div>
    )
}

export default JobList