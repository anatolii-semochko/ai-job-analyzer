import React, { useState, useEffect } from 'react'
import { fetch as fetchJobs, updateFlags } from '../service/jobService'
import Table from './common/Table'
import TableFilter from './common/TableFilter'
import { ACTION_TYPES } from './common/TableActions'

const Favorites = ({ onUpdate }) => {
    const [jobs, setJobs] = useState([])
    const [loading, setLoading] = useState(true)
    const [sortBy, setSortBy] = useState('rate')
    const [sortOrder, setSortOrder] = useState('desc')

    const loadJobs = async () => {
        setLoading(true)
        try {
            const data = await fetchJobs({ sortBy, sortOrder })
            const filtered = data.filter(j => j.favorite && !j.contacted && !j.hidden && !j.refused)
            setJobs(filtered)
        } catch (e) {
            console.error('Failed to load jobs:', e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadJobs()
    }, [sortBy, sortOrder])

    const handleAction = async (actionType, job) => {
        switch (actionType) {
            case ACTION_TYPES.FAVORITE:
                try {
                    const { job: updatedJob } = await updateFlags(job.hash, { favorite: !job.favorite })
                    if (updatedJob && !updatedJob.favorite) {
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
        }
    }

    const actions = [
        ACTION_TYPES.FAVORITE,
        ACTION_TYPES.CONTACTED,
        ACTION_TYPES.HIDE,
    ]

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Favorites ({jobs.length})</h5>
                <TableFilter
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSortByChange={setSortBy}
                    onSortOrderChange={setSortOrder}
                    onRefresh={loadJobs}
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
                    emptyMessage="No favorite jobs"
                />
            )}
        </div>
    )
}

export default Favorites
