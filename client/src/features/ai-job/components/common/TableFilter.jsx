import React, { useState, useEffect, useRef } from 'react'

const sortOptions = [
    { value: 'dateAdd', label: 'Date Added' },
    { value: 'datePublish', label: 'Date Published' },
    { value: 'rate', label: 'Rating' },
    { value: 'salary', label: 'Salary' },
]

const TableFilter = ({
    sortBy,
    sortOrder,
    onSortByChange,
    onSortOrderChange,
    onRefresh,
    children,
    filterOptions,
    filters,
    onFilterChange,
    onReset,
    onAddJob,
}) => {
    const [searchInput, setSearchInput] = useState(filters?.search || '')
    const debounceRef = useRef(null)

    useEffect(() => {
        setSearchInput(filters?.search || '')
    }, [filters?.search])

    const handleSearchChange = (value) => {
        setSearchInput(value)

        if (debounceRef.current) {
            clearTimeout(debounceRef.current)
        }

        debounceRef.current = setTimeout(() => {
            onFilterChange?.('search', value)
        }, 1000)
    }

    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current)
            }
        }
    }, [])

    const hasFilters = filterOptions && (
        filterOptions.parsers?.length > 0 ||
        filterOptions.countries?.length > 0 ||
        filterOptions.companies?.length > 0
    )

    const hasActiveFilters = filters?.search || filters?.parser || filters?.country || filters?.company

    return (
        <div className="d-flex gap-2 flex-wrap">
            {children}
            
            {onAddJob && (
                <button
                    className="btn btn-success btn-sm"
                    onClick={onAddJob}
                    title="Add new job manually"
                >
                    Add
                </button>
            )}

            <input
                type="text"
                className="form-control form-control-sm"
                style={{ width: '150px' }}
                placeholder="Search..."
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
            />

            {hasFilters && filterOptions.parsers?.length > 0 && (
                <select
                    className="form-select form-select-sm"
                    style={{ width: 'auto', minWidth: '100px' }}
                    value={filters?.parser || ''}
                    onChange={(e) => onFilterChange?.('parser', e.target.value)}
                >
                    <option value="">All Sources</option>
                    {filterOptions.parsers.map(p => (
                        <option key={p} value={p}>{p}</option>
                    ))}
                </select>
            )}

            {hasFilters && filterOptions.countries?.length > 0 && (
                <select
                    className="form-select form-select-sm"
                    style={{ width: 'auto', minWidth: '100px', maxWidth: '200px' }}
                    value={filters?.country || ''}
                    onChange={(e) => onFilterChange?.('country', e.target.value)}
                >
                    <option value="">All Locations</option>
                    {filterOptions.countries.map(c => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
            )}

            {hasFilters && filterOptions.companies?.length > 0 && (
                <select
                    className="form-select form-select-sm"
                    style={{ width: 'auto', minWidth: '120px', maxWidth: '200px' }}
                    value={filters?.company || ''}
                    onChange={(e) => onFilterChange?.('company', e.target.value)}
                >
                    <option value="">All Companies</option>
                    {filterOptions.companies.map(c => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
            )}

            <select
                className="form-select form-select-sm"
                style={{ width: 'auto' }}
                value={sortBy}
                onChange={(e) => onSortByChange(e.target.value)}
            >
                {sortOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
            <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => onSortOrderChange(sortOrder === 'desc' ? 'asc' : 'desc')}
            >
                {sortOrder === 'desc' ? '↓' : '↑'}
            </button>
            {hasActiveFilters && (
                <button
                    className="btn btn-outline-warning btn-sm"
                    onClick={onReset}
                    title="Reset filters"
                >
                    Reset
                </button>
            )}
            <button
                className="btn btn-outline-primary btn-sm"
                onClick={onRefresh}
            >
                Refresh
            </button>
        </div>
    )
}

export default TableFilter
