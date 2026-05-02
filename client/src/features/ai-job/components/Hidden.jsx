import React, { useState, useEffect } from 'react'
import { fetch as fetchJobs, remove, updateFlags, getFilterOptions } from '../service/jobService'
import Table from './common/Table'
import TableFilter from './common/TableFilter'
import { ACTION_TYPES } from './common/TableActions'

const Hidden = ({ onUpdate }) => {
    const [jobs, setJobs] = useState([])
    const [loading, setLoading] = useState(true)
    const [sortBy, setSortBy] = useState('dateAdd')
    const [sortOrder, setSortOrder] = useState('desc')
    const [filterOptions, setFilterOptions] = useState(null)
    const [filters, setFilters] = useState({ parser: '', country: '', company: '', search: '' })

    const loadJobs = async () => {
        setLoading(true)
        try {
            const options = await getFilterOptions()
            if (options) {
                setFilterOptions(options)
            }

            const data = await fetchJobs({ sortBy, sortOrder })
            let filtered = data.filter(j => j.hidden || j.refused)

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

    const handleAction = async (actionType, job) => {
        switch (actionType) {
            case ACTION_TYPES.SHOW:
                try {
                    await updateFlags(job.hash, { hidden: false, refused: false })
                    setJobs(jobs.filter(j => j.hash !== job.hash))
                    onUpdate?.()
                } catch (e) {
                    console.error('Failed to restore job:', e)
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

    const actions = [
        ACTION_TYPES.SHOW,
        ACTION_TYPES.REMOVE,
    ]

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Hidden ({jobs.length})</h5>
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
                />
            </div>

            {loading ? (
                <p className="text-muted">Loading...</p>
            ) : (
                <Table
                    jobs={jobs}
                    actions={actions}
                    onAction={handleAction}
                    onJobUpdate={(updatedJob) => setJobs(jobs.map(j => j.hash === updatedJob.hash ? updatedJob : j))}
                    emptyMessage="No hidden jobs"
                />
            )}
        </div>
    )
}

export default Hidden
