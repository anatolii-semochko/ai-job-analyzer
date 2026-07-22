import { aiRun } from '@react/api/nodeApi'
import { saveRatings, buildSystemPrompt } from './jobService'
import contextCandidate from '@config/contextCandidate.json'
import contextGenerate from '@config/contextGenerate.json'
import promptGenerate from '@config/promptGenerage'

const buildJobPrompt = (job, systemPrompt) => {
    const description = job.description
        ? job.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').substring(0, 3000)
        : 'No description'

    return `${systemPrompt}

ВАКАНСІЯ ДЛЯ АНАЛІЗУ:
- Title: ${job.title}
- Company: ${job.company || 'Unknown'}
- Country: ${job.country || 'Unknown'}
- Salary: ${job.salary ? '$' + job.salary : 'Not specified'}
- Description: ${description}`
}

const parseRatings = (response) => {
    try {
        const jsonMatch = response.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
            console.error('[JobAI] No JSON found in response:', response)
            return null
        }

        const data = JSON.parse(jsonMatch[0])

        const intFields = ['rateProfLevel', 'rateSkills', 'rateCompanyType', 'rateLocation', 'rateSalary', 'rateExpectations']
        const result = {}

        for (const field of intFields) {
            const value = parseInt(data[field], 10)
            if (isNaN(value)) {
                console.warn(`[JobAI] Invalid value for ${field}:`, data[field])
                result[field] = null
            } else {
                result[field] = Math.max(1, Math.min(10, value))
            }
        }

        const rateValue = parseFloat(data.rate)
        if (isNaN(rateValue)) {
            console.warn(`[JobAI] Invalid value for rate:`, data.rate)
            result.rate = null
        } else {
            result.rate = Math.round(Math.max(0, Math.min(10, rateValue)) * 10) / 10
        }

        if (data.explain && typeof data.explain === 'object') {
            result.ratesExplain = {
                profLevel: data.explain.profLevel || null,
                skills: data.explain.skills || null,
                companyType: data.explain.companyType || null,
                location: data.explain.location || null,
                salary: data.explain.salary || null,
                expectations: data.explain.expectations || null,
                total: data.explain.total || null,
            }
        } else {
            result.ratesExplain = null
        }

        return result
    } catch (e) {
        console.error('[JobAI] Failed to parse ratings:', e, response)
        return null
    }
}

export const analyzeJob = async (job) => {
    console.log('[JobAI] Analyzing job:', job.title)

    try {
        const systemPrompt = await buildSystemPrompt()
        const prompt = buildJobPrompt(job, systemPrompt)
        console.log('[JobAI] Prompt length:', prompt.length)

        const response = await aiRun(prompt, false)
        console.log('[JobAI] AI Response:', response)

        const message = response.message || response
        const ratings = parseRatings(typeof message === 'string' ? message : JSON.stringify(message))

        if (!ratings) {
            return { success: false, error: 'Failed to parse AI response' }
        }

        console.log('[JobAI] Parsed ratings:', ratings)

        const { job: savedJob, action } = await saveRatings(job.hash, ratings)

        if (action === 'not_found') {
            return { success: false, error: 'Job not found in database' }
        }

        console.log('[JobAI] Job updated:', savedJob)
        return { success: true, job: savedJob }

    } catch (e) {
        console.error('[JobAI] Analysis failed:', e)
        return { success: false, error: e.message || 'Analysis failed' }
    }
}

export const analyzeJobs = async (jobs, onProgress) => {
    const result = { analyzed: 0, failed: 0, errors: [] }

    for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i]
        onProgress?.(i + 1, jobs.length, job)

        const { success, error } = await analyzeJob(job)

        if (success) {
            result.analyzed++
        } else {
            result.failed++
            result.errors.push(`${job.title}: ${error}`)
        }

        if (i < jobs.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000))
        }
    }

    return result
}

const buildGenerateApplyDataPrompt = (job) => {
    const candidateContext = {
        ...contextCandidate,
        ...contextGenerate,
    }

    return `${promptGenerate}

candidateContext (JSON):
${JSON.stringify(candidateContext)}

job (JSON):
${JSON.stringify(job)}`
}

const findJsonObjects = (text) => {
    const objects = []

    for (let i = 0; i < text.length; i++) {
        if (text[i] !== '{') continue

        let depth = 0
        for (let j = i; j < text.length; j++) {
            if (text[j] === '{') depth++
            else if (text[j] === '}') {
                depth--
                if (depth === 0) {
                    objects.push(text.slice(i, j + 1))
                    break
                }
            }
        }
    }

    return objects
}

const parseGeneratedData = (response) => {
    const candidates = findJsonObjects(response)

    if (!candidates.length) {
        console.error('[JobAI] No JSON found in generate response:', response)
        return null
    }

    for (const candidate of candidates) {
        try {
            const data = JSON.parse(candidate)
            if (data.generatedData) return data.generatedData
        } catch {
            // not valid JSON, try next candidate
        }
    }

    console.error('[JobAI] No generatedData found in generate response:', response)
    return null
}

export const generateApplyData = async (job) => {
    console.log('[JobAI] Generating apply data for job:', job.title)

    try {
        const prompt = buildGenerateApplyDataPrompt(job)
        console.log('[JobAI] Generate apply data prompt length:', prompt.length)

        const response = await aiRun(prompt, false)
        console.log('[JobAI] AI Generate Response:', response)

        const message = response.message || response
        const generatedData = parseGeneratedData(typeof message === 'string' ? message : JSON.stringify(message))

        if (!generatedData) {
            return { success: false, error: 'Failed to parse AI response' }
        }

        console.log('[JobAI] Generated apply data:', generatedData)
        return { success: true, generatedData }

    } catch (e) {
        console.error('[JobAI] Generate apply data failed:', e)
        return { success: false, error: e.message || 'Generate failed' }
    }
}

export default { analyzeJob, analyzeJobs, generateApplyData }
