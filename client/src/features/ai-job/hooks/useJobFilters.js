import { useState, useEffect } from 'react'
import { getFilterOptions } from '../service/jobService'

export const useJobFilters = () => {
    const [filterOptions, setFilterOptions] = useState(null)
    const [filters, setFilters] = useState(() => {
        try {
            const saved = localStorage.getItem('aiJob_filters')
            return saved ? JSON.parse(saved) : { parser: '', country: '', company: '', search: '' }
        } catch (e) {
            return { parser: '', country: '', company: '', search: '' }
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
        setFilters({ parser: '', country: '', company: '', search: '' })
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
                return titleMatch || descMatch
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