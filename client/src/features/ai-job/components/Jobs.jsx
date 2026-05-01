import React, { useState, useEffect } from 'react'
import { fetch as fetchJobs, remove, updateFlags, getFilterOptions, updateFilterOptions } from '../service/jobService'
import { analyzeJob } from '../service/jobAi'
import Table from './common/Table'
import TableFilter from './common/TableFilter'
import AddJobModal from './common/AddJobModal'
import { ACTION_TYPES } from './common/TableActions'

const Jobs = ({ onUpdate }) => {
    const [jobs, setJobs] = useState([])
    const [loading, setLoading] = useState(true)
    const [sortBy, setSortBy] = useState('rate')
    const [sortOrder, setSortOrder] = useState('desc')
    const [analyzingJob, setAnalyzingJob] = useState(null)
    const [batchAnalyzing, setBatchAnalyzing] = useState(false)
    const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 })
    const [filterOptions, setFilterOptions] = useState(null)
    const [filters, setFilters] = useState({ parser: '', country: '', company: '', search: '' })
    const [showAddModal, setShowAddModal] = useState(false)

    const loadJobs = async () => {
        setLoading(true)
        try {
            const options = await getFilterOptions()
            if (options) {
                setFilterOptions(options)
            }

            const data = await fetchJobs({ sortBy, sortOrder })
            let filtered = data.filter(j => !j.favorite && !j.contacted && !j.hidden && !j.refused)

            if (filters.parser) {
                filtered = filtered.filter(j => j.parser === filters.parser)
            }
            if (filters.country) {
                filtered = filtered.filter(j => j.country === filters.country)
            }
            if (filters.company) {
                filtered = filtered.filter(j => j.company === filters.company)
            }
            if (filters.search) {
                const searchLower = filters.search.toLowerCase()
                filtered = filtered.filter(j => {
                    const titleMatch = j.title?.toLowerCase().includes(searchLower)
                    const descMatch = j.description?.toLowerCase().includes(searchLower)
                    return titleMatch || descMatch
                })
            }

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

    const handleFilterChange = (filterName, value) => {
        setFilters(prev => ({ ...prev, [filterName]: value }))
    }

    const handleResetFilters = () => {
        setFilters({ parser: '', country: '', company: '', search: '' })
    }

    const unanalyzedJobs = jobs.filter(j => j.rate === null || j.rate === undefined)

    const handleBatchAnalyze = async () => {
        if (unanalyzedJobs.length === 0) return

        setBatchAnalyzing(true)
        setBatchProgress({ current: 0, total: unanalyzedJobs.length })

        let updatedJobs = [...jobs]

        for (let i = 0; i < unanalyzedJobs.length; i++) {
            const job = unanalyzedJobs[i]
            setBatchProgress({ current: i + 1, total: unanalyzedJobs.length })
            setAnalyzingJob(job.hash)

            try {
                const { success, job: analyzedJob } = await analyzeJob(job)
                if (success && analyzedJob) {
                    updatedJobs = updatedJobs.map(j => j.hash === analyzedJob.hash ? analyzedJob : j)
                    setJobs(updatedJobs)
                }
            } catch (e) {
                console.error('Failed to analyze job:', job.title, e)
            }

            if (i < unanalyzedJobs.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500))
            }
        }

        setAnalyzingJob(null)
        setBatchAnalyzing(false)
        setBatchProgress({ current: 0, total: 0 })
    }

    const handleAction = async (actionType, job) => {
        switch (actionType) {
            case ACTION_TYPES.AI:
                setAnalyzingJob(job.hash)
                try {
                    const { success, job: updatedJob, error } = await analyzeJob(job)
                    if (success && updatedJob) {
                        setJobs(jobs.map(j => j.hash === updatedJob.hash ? updatedJob : j))
                    } else {
                        alert(`Analysis failed: ${error}`)
                    }
                } catch (e) {
                    console.error('Failed to analyze job:', e)
                    alert(`Analysis failed: ${e.message}`)
                } finally {
                    setAnalyzingJob(null)
                }
                break

            case ACTION_TYPES.FAVORITE:
                try {
                    const { job: updatedJob } = await updateFlags(job.hash, { favorite: !job.favorite })
                    if (updatedJob && updatedJob.favorite) {
                        setJobs(jobs.filter(j => j.hash !== job.hash))
                        onUpdate?.()
                    }
                } catch (e) {
                    console.error('Failed to update job:', e)
                }
                break

            case ACTION_TYPES.CONTACTED:
                try {
                    const { job: updatedJob } = await updateFlags(job.hash, { contacted: !job.contacted })
                    if (updatedJob && updatedJob.contacted) {
                        setJobs(jobs.filter(j => j.hash !== job.hash))
                        onUpdate?.()
                    }
                } catch (e) {
                    console.error('Failed to update job:', e)
                }
                break

            case ACTION_TYPES.HIDE:
                try {
                    await updateFlags(job.hash, { hidden: true })
                    setJobs(jobs.filter(j => j.hash !== job.hash))
                    onUpdate?.()
                } catch (e) {
                    console.error('Failed to hide job:', e)
                }
                break

            case ACTION_TYPES.REMOVE:
                if (!confirm('Delete this job permanently?')) return
                try {
                    await remove(job.hash)
                    setJobs(jobs.filter(j => j.hash !== job.hash))
                    onUpdate?.()
                } catch (e) {
                    console.error('Failed to delete job:', e)
                }
                break
        }
    }

    const handleAddJob = () => {
        setShowAddModal(true)
    }

    const handleJobAdded = async (newJob) => {
        await updateFilterOptions()
        await loadJobs()
        onUpdate?.()
    }

    const actions = [
        ACTION_TYPES.AI,
        ACTION_TYPES.FAVORITE,
        ACTION_TYPES.CONTACTED,
        ACTION_TYPES.HIDE,
        ACTION_TYPES.REMOVE,
    ]

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Jobs ({jobs.length})</h5>
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
                    onAddJob={handleAddJob}
                >
                    {unanalyzedJobs.length > 0 && (
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={handleBatchAnalyze}
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
                    emptyMessage="No new jobs in database"
                />
            )}

            <AddJobModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onJobAdded={handleJobAdded}
                filterOptions={filterOptions}
            />
        </div>
    )
}

export default Jobs
