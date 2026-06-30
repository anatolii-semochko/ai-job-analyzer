import { openDB } from 'idb'
import { createJob, createJobHash, isJobChanged, updateJob } from '../model/job'
import promptDefault from '@config/promptDefault'
import promptMain from '@config/promptMain'

const DB_NAME = 'ai-job-db'
const DB_VERSION = 3
const STORE_NAME = 'jobs'
const FILTERS_STORE_NAME = 'filters'
const PROMPT_KEY = 'candidate_prompt'
const APPLY_PROMPT_KEY = 'apply_prompt'

const getDb = async () => {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'hash' })
                store.createIndex('parser', 'parser')
                store.createIndex('dateAdd', 'dateAdd')
                store.createIndex('rate', 'rate')
            }
            if (oldVersion < 2) {
                if (!db.objectStoreNames.contains(FILTERS_STORE_NAME)) {
                    db.createObjectStore(FILTERS_STORE_NAME, { keyPath: 'key' })
                }
            }
            if (oldVersion < 3) {
                // Додано поля status і statusDate в версії 3
                // IndexedDB автоматично підтримує нові поля в об'єктах
            }
        },
    })
}

export const get = async (hash) => {
    const db = await getDb()
    return db.get(STORE_NAME, hash)
}

export const save = async (jobData) => {
    const db = await getDb()
    const hash = jobData.hash || createJobHash(jobData)

    const existingJob = await db.get(STORE_NAME, hash)

    if (!existingJob) {
        const job = createJob({
            ...jobData,
            status: jobData.isDeactivated ? 'Deactivated' : jobData.status
        })
        await db.put(STORE_NAME, job)
        return { job, action: 'created' }
    }

    if (isJobChanged(existingJob, jobData)) {
        const job = updateJob(existingJob, {
            ...jobData,
            status: jobData.isDeactivated ? 'Deactivated' : (jobData.status || existingJob.status)
        })
        await db.put(STORE_NAME, job)
        return { job, action: 'updated' }
    }

    return { job: existingJob, action: 'unchanged' }
}

export const fetch = async (options = {}) => {
    const db = await getDb()
    let jobs = await db.getAll(STORE_NAME)

    if (options.parser) {
        jobs = jobs.filter(job => job.parser === options.parser)
    }

    const sortBy = options.sortBy || 'dateAdd'
    const sortOrder = options.sortOrder || 'desc'

    jobs.sort((a, b) => {
        let aVal = a[sortBy]
        let bVal = b[sortBy]

        // Special handling for messages - sort by count
        if (sortBy === 'messages') {
            aVal = Array.isArray(a.messages) ? a.messages.length : 0
            bVal = Array.isArray(b.messages) ? b.messages.length : 0
        }

        // Handle null/undefined values
        if (aVal == null) aVal = ''
        if (bVal == null) bVal = ''

        // For string comparison (like status, comments), use localeCompare
        if (typeof aVal === 'string' && typeof bVal === 'string') {
            const comparison = aVal.localeCompare(bVal)
            return sortOrder === 'desc' ? -comparison : comparison
        }

        // For numeric comparison, use original logic
        if (aVal == null || aVal === '') aVal = 0
        if (bVal == null || bVal === '') bVal = 0

        if (sortOrder === 'desc') {
            return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
        }
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
    })

    return jobs
}

export const saveRatings = async (hash, ratings) => {
    const db = await getDb()
    const existingJob = await db.get(STORE_NAME, hash)

    if (!existingJob) {
        return { job: null, action: 'not_found' }
    }

    const updatedJob = {
        ...existingJob,
        dateUpdate: new Date().toISOString(),
        rateProfLevel: ratings.rateProfLevel ?? existingJob.rateProfLevel,
        rateSkills: ratings.rateSkills ?? existingJob.rateSkills,
        rateCompanyType: ratings.rateCompanyType ?? existingJob.rateCompanyType,
        rateSalary: ratings.rateSalary ?? existingJob.rateSalary,
        rateExpectations: ratings.rateExpectations ?? existingJob.rateExpectations,
        rateLocation: ratings.rateLocation ?? existingJob.rateLocation,
        rate: ratings.rate ?? existingJob.rate,
        ratesExplain: ratings.ratesExplain ?? existingJob.ratesExplain,
    }

    await db.put(STORE_NAME, updatedJob)
    return { job: updatedJob, action: 'updated' }
}

export const updateFlags = async (hash, flags) => {
    const db = await getDb()
    const existingJob = await db.get(STORE_NAME, hash)

    if (!existingJob) {
        return { job: null, action: 'not_found' }
    }

    const updatedJob = {
        ...existingJob,
        dateUpdate: new Date().toISOString(),
        favorite: flags.favorite ?? existingJob.favorite,
        contacted: flags.contacted ?? existingJob.contacted,
        hidden: flags.hidden ?? existingJob.hidden,
        refused: flags.refused ?? existingJob.refused,
    }

    await db.put(STORE_NAME, updatedJob)
    return { job: updatedJob, action: 'updated' }
}

export const saveComments = async (hash, comments) => {
    const db = await getDb()
    const existingJob = await db.get(STORE_NAME, hash)

    if (!existingJob) {
        return { job: null, action: 'not_found' }
    }

    const updatedJob = {
        ...existingJob,
        dateUpdate: new Date().toISOString(),
        comments,
    }

    await db.put(STORE_NAME, updatedJob)
    return { job: updatedJob, action: 'updated' }
}

export const saveGeneratedData = async (hash, generatedData) => {
    const db = await getDb()
    const existingJob = await db.get(STORE_NAME, hash)

    if (!existingJob) {
        return { job: null, action: 'not_found' }
    }

    const updatedJob = {
        ...existingJob,
        dateUpdate: new Date().toISOString(),
        generatedData,
    }

    await db.put(STORE_NAME, updatedJob)
    return { job: updatedJob, action: 'updated' }
}

export const saveMessages = async (hash, messages) => {
    const db = await getDb()
    const existingJob = await db.get(STORE_NAME, hash)

    if (!existingJob) {
        return { job: null, action: 'not_found' }
    }

    const updatedJob = {
        ...existingJob,
        dateUpdate: new Date().toISOString(),
        messages,
    }

    await db.put(STORE_NAME, updatedJob)
    return { job: updatedJob, action: 'updated' }
}

export const updateJobData = async (jobData) => {
    const db = await getDb()
    const hash = jobData.hash
    const existingJob = await db.get(STORE_NAME, hash)

    if (!existingJob) {
        return { job: null, action: 'not_found' }
    }

    const updatedJob = {
        ...existingJob,
        ...jobData,
        dateUpdate: new Date().toISOString(),
    }

    await db.put(STORE_NAME, updatedJob)
    return updatedJob
}

export const remove = async (hash) => {
    const db = await getDb()
    await db.delete(STORE_NAME, hash)
}

export const clear = async () => {
    const db = await getDb()
    await db.clear(STORE_NAME)
}

export const count = async () => {
    const db = await getDb()
    return db.count(STORE_NAME)
}

export const getStats = async () => {
    const db = await getDb()
    const allJobs = await db.getAll(STORE_NAME)

    const stats = { jobs: 0, favorites: 0, requested: 0, contacted: 0, refused: 0, hidden: 0 }

    for (const job of allJobs) {
        if (job.status === 'Refused') {
            stats.refused++
        } else if (['Waiting answer', 'Negotiations', 'Interview'].includes(job.status)) {
            stats.contacted++
        } else if (job.status === 'Requested') {
            stats.requested++
        } else if (job.hidden || job.refused) {
            stats.hidden++
        } else if (job.favorite) {
            stats.favorites++
        } else {
            stats.jobs++
        }
    }

    return stats
}

export const updateFilterOptions = async () => {
    const db = await getDb()
    const allJobs = await db.getAll(STORE_NAME)

    const parsers = new Set()
    const countries = new Set()
    const companies = new Set()

    for (const job of allJobs) {
        if (job.parser) parsers.add(job.parser)
        if (job.country) countries.add(job.country)
        if (job.company) companies.add(job.company)
    }

    const filterOptions = {
        parsers: Array.from(parsers).sort(),
        countries: Array.from(countries).sort(),
        companies: Array.from(companies).sort(),
    }

    await db.put(FILTERS_STORE_NAME, { key: 'options', ...filterOptions })

    return filterOptions
}

export const getFilterOptions = async () => {
    const db = await getDb()
    const options = await db.get(FILTERS_STORE_NAME, 'options')
    return options || null
}

export const exportDatabase = async () => {
    const db = await getDb()
    const jobs = await db.getAll(STORE_NAME)
    const filters = await db.getAll(FILTERS_STORE_NAME)

    return {
        version: DB_VERSION,
        exportDate: new Date().toISOString(),
        jobs,
        filters,
    }
}

export const importJobs = async (jobs) => {
    if (!Array.isArray(jobs)) {
        throw new Error('Jobs must be an array')
    }

    const db = await getDb()
    const results = { imported: 0, updated: 0, skipped: 0 }

    for (const jobData of jobs) {
        if (!jobData.hash) {
            results.skipped++
            continue
        }

        const existingJob = await db.get(STORE_NAME, jobData.hash)

        if (!existingJob) {
            await db.put(STORE_NAME, jobData)
            results.imported++
        } else {
            const mergedJob = {
                ...existingJob,
                ...jobData,
                favorite: jobData.favorite ?? existingJob.favorite,
                contacted: jobData.contacted ?? existingJob.contacted,
                hidden: jobData.hidden ?? existingJob.hidden,
                refused: jobData.refused ?? existingJob.refused,
                comments: jobData.comments || existingJob.comments,
            }
            await db.put(STORE_NAME, mergedJob)
            results.updated++
        }
    }

    await updateFilterOptions()

    return results
}

export const getPrompt = async () => {
    const db = await getDb()
    const record = await db.get(FILTERS_STORE_NAME, PROMPT_KEY)
    if (record && record.value !== undefined) {
        return record.value
    }
    return promptDefault
}

export const savePrompt = async (value) => {
    const db = await getDb()
    await db.put(FILTERS_STORE_NAME, { key: PROMPT_KEY, value })
}

export const getApplyPrompt = async () => {
    const db = await getDb()
    const record = await db.get(FILTERS_STORE_NAME, APPLY_PROMPT_KEY)
    if (record && record.value !== undefined) {
        return record.value
    }
    return `Hello [Company] Team,

I would like to apply for the [Role] position.

Education: [Education]

LinkedIn: [LinkedInLink]

Thank you for considering my application. I would be glad to discuss how my experience can contribute to your team.

Best regards,
[MyName]`
}

export const saveApplyPrompt = async (value) => {
    const db = await getDb()
    await db.put(FILTERS_STORE_NAME, { key: APPLY_PROMPT_KEY, value })
}

export const buildSystemPrompt = async () => {
    const candidatePrompt = await getPrompt()
    return promptMain.replace('{candidate_prompt}', candidatePrompt)
}

export default {
    get,
    save,
    saveRatings,
    saveComments,
    saveGeneratedData,
    updateFlags,
    updateJobData,
    fetch,
    remove,
    clear,
    count,
    getStats,
    updateFilterOptions,
    getFilterOptions,
    exportDatabase,
    importJobs,
    getPrompt,
    savePrompt,
    getApplyPrompt,
    saveApplyPrompt,
    buildSystemPrompt,
}
