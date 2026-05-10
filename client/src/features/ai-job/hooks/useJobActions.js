import { useState } from 'react'
import { remove, updateFlags, updateFilterOptions } from '../service/jobService'
import { analyzeJob } from '../service/jobAi'
import { ACTION_TYPES } from '../components/common/TableActions'

export const useJobActions = (jobs, setJobs, onUpdate, onJobProcessed) => {
    const [analyzingJob, setAnalyzingJob] = useState(null)
    const [batchAnalyzing, setBatchAnalyzing] = useState(false)
    const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 })

    const handleAction = async (actionType, job) => {
        switch (actionType) {
            case ACTION_TYPES.AI:
                setAnalyzingJob(job.hash)
                try {
                    const { success, job: updatedJob, error } = await analyzeJob(job)
                    if (success && updatedJob) {
                        setJobs(jobs.map(j => j.hash === updatedJob.hash ? updatedJob : j))
                        onJobProcessed?.(job.hash)
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
                    if (updatedJob) {
                        if (updatedJob.favorite && !job.favorite) {
                            // Job was marked as favorite, remove from current list if not in favorites view
                            setJobs(jobs.filter(j => j.hash !== job.hash))
                        } else if (!updatedJob.favorite && job.favorite) {
                            // Job was unmarked as favorite, remove from favorites view or update in place
                            setJobs(jobs.filter(j => j.hash !== job.hash))
                        } else {
                            // Update in place
                            setJobs(jobs.map(j => j.hash === updatedJob.hash ? updatedJob : j))
                        }
                        onJobProcessed?.(job.hash)
                        onUpdate?.()
                    }
                } catch (e) {
                    console.error('Failed to update job:', e)
                }
                break

            case ACTION_TYPES.CONTACTED:
                try {
                    const { job: updatedJob } = await updateFlags(job.hash, { contacted: !job.contacted })
                    if (updatedJob) {
                        if (updatedJob.contacted && !job.contacted) {
                            // Job was marked as contacted, remove from current list if not in contacted view
                            setJobs(jobs.filter(j => j.hash !== job.hash))
                        } else {
                            // Update in place
                            setJobs(jobs.map(j => j.hash === updatedJob.hash ? updatedJob : j))
                        }
                        onJobProcessed?.(job.hash)
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
                    onJobProcessed?.(job.hash)
                    onUpdate?.()
                } catch (e) {
                    console.error('Failed to hide job:', e)
                }
                break

            case ACTION_TYPES.SHOW:
                try {
                    await updateFlags(job.hash, { hidden: false, refused: false })
                    setJobs(jobs.filter(j => j.hash !== job.hash))
                    onJobProcessed?.(job.hash)
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
                    await updateFilterOptions()
                    onJobProcessed?.(job.hash)
                    onUpdate?.()
                } catch (e) {
                    console.error('Failed to delete job:', e)
                }
                break
        }
    }

    const handleBatchAnalyze = async (unanalyzedJobs) => {
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
                    onJobProcessed?.(job.hash)
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

    return {
        analyzingJob,
        batchAnalyzing,
        batchProgress,
        handleAction,
        handleBatchAnalyze,
    }
}