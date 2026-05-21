import { useState, useEffect } from 'react'
import { getFilterOptions } from '../service/jobService'

const getTimeFilterDate = (now, timeFilter) => {
    const date = new Date(now)

    switch (timeFilter) {
        case 'last_hour':
            date.setHours(date.getHours() - 1)
            break
        case 'today':
            const today = new Date(now)
            today.setHours(0, 0, 0, 0)
            const todayEnd = new Date(now)
            todayEnd.setHours(23, 59, 59, 999)
            return { start: today, end: todayEnd, isRange: true }
        case 'last_day':
            date.setDate(date.getDate() - 1)
            break
        case 'yesterday':
            const yesterday = new Date(now)
            yesterday.setDate(yesterday.getDate() - 1)
            yesterday.setHours(0, 0, 0, 0)
            const yesterdayEnd = new Date(yesterday)
            yesterdayEnd.setHours(23, 59, 59, 999)
            return { start: yesterday, end: yesterdayEnd, isRange: true }
        case 'last_week':
            date.setDate(date.getDate() - 7)
            break
        case 'last_month':
            date.setMonth(date.getMonth() - 1)
            break
        default:
            return null
    }

    return date
}

export const useJobFilters = () => {
    const [filterOptions, setFilterOptions] = useState(null)
    const [filters, setFilters] = useState(() => {
        try {
            const saved = localStorage.getItem('aiJob_filters')
            return saved ? JSON.parse(saved) : { parser: '', country: '', company: '', search: '', timeFilter: '' }
        } catch (e) {
            return { parser: '', country: '', company: '', search: '', timeFilter: '' }
        }
    })

    useEffect(() => {
        const loadFilterOptions = async () => {
            try {
                const options = await getFilterOptions()
                if (options) {
                    setFilterOptions(options)
                }
            } catch (e) {
                console.error('Failed to load filter options:', e)
            }
        }
        loadFilterOptions()
    }, [])

    useEffect(() => {
        localStorage.setItem('aiJob_filters', JSON.stringify(filters))
    }, [filters])

    const handleFilterChange = (filterName, value) => {
        setFilters(prev => ({ ...prev, [filterName]: value }))
    }

    const handleResetFilters = () => {
        setFilters({ parser: '', country: '', company: '', search: '', timeFilter: '' })
    }

    const applyFilters = (jobs) => {
        let filtered = [...jobs]

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
                const companyMatch = j.company?.toLowerCase().includes(searchLower)
                const countryMatch = j.country?.toLowerCase().includes(searchLower)
                const parserMatch = j.parser?.toLowerCase().includes(searchLower)
                const statusMatch = j.status?.toLowerCase().includes(searchLower)
                const salaryMatch = j.salary?.toString().toLowerCase().includes(searchLower)
                const commentsMatch = j.comments?.toLowerCase().includes(searchLower)
                const hrefMatch = j.href?.toLowerCase().includes(searchLower)

                // Search in messages
                const messagesMatch = j.messages?.some(msg =>
                    msg.body?.toLowerCase().includes(searchLower)
                ) || false

                return titleMatch || descMatch || companyMatch || countryMatch ||
                       parserMatch || statusMatch || salaryMatch || commentsMatch ||
                       hrefMatch || messagesMatch
            })
        }
        if (filters.timeFilter) {
            const now = new Date()
            const filterDate = getTimeFilterDate(now, filters.timeFilter)
            filtered = filtered.filter(j => {
                if (!j.dateAdd) return false
                const jobDate = new Date(j.dateAdd)

                if (filterDate && filterDate.isRange) {
                    return jobDate >= filterDate.start && jobDate <= filterDate.end
                }

                return filterDate ? jobDate >= filterDate : true
            })
        }

        return filtered
    }

    const refreshFilterOptions = async () => {
        try {
            const options = await getFilterOptions()
            if (options) {
                setFilterOptions(options)
            }
        } catch (e) {
            console.error('Failed to refresh filter options:', e)
        }
    }

    return {
        filterOptions,
        filters,
        handleFilterChange,
        handleResetFilters,
        applyFilters,
        refreshFilterOptions,
    }
}