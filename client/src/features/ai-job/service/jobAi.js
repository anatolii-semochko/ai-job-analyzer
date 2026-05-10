import { aiRun } from '@react/api/nodeApi'
import { saveRatings, buildSystemPrompt, getPrompt } from './jobService'
import promptComposeRequest from '@config/promptComposeRequest'

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

        const intFields = ['rateProfLevel', 'rateSkills', 'rateCompanyType', 'rateSalary', 'rateExpectations']
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

const buildComposeRequestPrompt = async (job) => {
    const candidatePrompt = await getPrompt()

    const description = job.description
        ? job.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').substring(0, 2000)
        : 'No description available'

    const previousMessages = job.messages && job.messages.length > 0
        ? job.messages.map(msg => `[${msg.type.toUpperCase()}] ${msg.text}`).join('\n\n')
        : 'No previous correspondence.'

    return promptComposeRequest
        .replace('{candidate_prompt}', candidatePrompt || 'No candidate profile available')
        .replace('{job_title}', job.title || 'Unknown')
        .replace('{job_company}', job.company || 'Unknown')
        .replace('{job_country}', job.country || 'Unknown')
        .replace('{job_salary}', job.salary ? `$${job.salary}` : 'Not specified')
        .replace('{job_description}', description)
        .replace('{previous_messages}', previousMessages)
}

const parseComposeResponse = (response) => {
    try {
        // Спочатку спробуємо знайти JSON блок з subject і body
        let jsonStart = response.indexOf('{')
        while (jsonStart !== -1) {
            let braceCount = 0
            let i = jsonStart

            // Знайти кінець JSON об'єкта
            while (i < response.length) {
                if (response[i] === '{') braceCount++
                if (response[i] === '}') braceCount--
                i++
                if (braceCount === 0) break
            }

            if (braceCount === 0) {
                const jsonStr = response.substring(jsonStart, i)
                try {
                    const data = JSON.parse(jsonStr)
                    if (data.subject && data.body) {
                        return {
                            subject: data.subject,
                            body: data.body
                        }
                    }
                } catch (parseError) {
                    // Спробуємо наступний JSON блок
                }
            }

            // Шукаємо наступний JSON блок
            jsonStart = response.indexOf('{', jsonStart + 1)
        }

        console.error('[JobAI] No valid subject/body JSON found in response:', response)
        return null
    } catch (e) {
        console.error('[JobAI] Failed to parse compose response:', e, response)
        return null
    }
}

export const composeRequest = async (job) => {
    console.log('[JobAI] Composing request for job:', job.title)

    try {
        const prompt = await buildComposeRequestPrompt(job)
        console.log('[JobAI] Compose prompt length:', prompt.length)

        const response = await aiRun(prompt, false)
        console.log('[JobAI] AI Compose Response:', response)

        const message = response.message || response
        const result = parseComposeResponse(typeof message === 'string' ? message : JSON.stringify(message))

        if (!result) {
            return { success: false, error: 'Failed to parse AI response' }
        }

        console.log('[JobAI] Composed email:', result)
        return { success: true, email: result }

    } catch (e) {
        console.error('[JobAI] Compose failed:', e)
        return { success: false, error: e.message || 'Compose failed' }
    }
}

export default { analyzeJob, analyzeJobs, composeRequest }
