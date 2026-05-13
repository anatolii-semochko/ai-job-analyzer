import React, { useState, useEffect } from 'react'
import { save } from '../../service/jobService'

const AddJobModal = ({ isOpen, onClose, onJobAdded, filterOptions, editJob = null }) => {
    const [formData, setFormData] = useState({
        title: '',
        company: '',
        newCompany: '',
        useNewCompany: false,
        parser: '',
        newParser: '',
        useNewParser: false,
        country: '',
        salary: '',
        description: '',
        href: ''
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (isOpen) {
            if (editJob) {
                // Initialize form with edit data
                setFormData({
                    title: editJob.title || '',
                    company: editJob.company || '',
                    newCompany: '',
                    useNewCompany: false,
                    parser: editJob.parser || '',
                    newParser: '',
                    useNewParser: false,
                    country: editJob.country || '',
                    salary: String(editJob.salary || ''),
                    description: editJob.description || '',
                    href: editJob.href || ''
                })
            } else {
                // Initialize with empty form for new job
                setFormData({
                    title: '',
                    company: '',
                    newCompany: '',
                    useNewCompany: false,
                    parser: '',
                    newParser: '',
                    useNewParser: false,
                    country: '',
                    salary: '',
                    description: '',
                    href: ''
                })
            }
            setError(null)
            setSaving(false)
        }
    }, [isOpen, editJob])

    const handleInputChange = (field, value) => {
        setFormData(prev => {
            const newData = { ...prev, [field]: value }

            // Handle company fields
            if (field === 'company') {
                if (value) {
                    newData.useNewCompany = false
                    newData.newCompany = ''
                } else {
                    newData.useNewCompany = false
                }
            } else if (field === 'newCompany') {
                if (value) {
                    newData.useNewCompany = true
                    newData.company = ''
                } else {
                    newData.useNewCompany = false
                }
            }

            // Handle parser fields
            if (field === 'parser') {
                if (value) {
                    newData.useNewParser = false
                    newData.newParser = ''
                } else {
                    newData.useNewParser = false
                }
            } else if (field === 'newParser') {
                if (value) {
                    newData.useNewParser = true
                    newData.parser = ''
                } else {
                    newData.useNewParser = false
                }
            }

            return newData
        })
    }

    const validateForm = () => {
        if (!formData.title.trim()) return 'Title is required'
        if (!formData.company.trim() && !formData.newCompany.trim()) return 'Company is required'
        if (!formData.parser.trim() && !formData.newParser.trim()) return 'Source is required'
        if (!formData.description.trim()) return 'Description is required'
        return null
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        const validationError = validateForm()
        if (validationError) {
            setError(validationError)
            return
        }

        setSaving(true)
        setError(null)

        try {
            const jobData = {
                title: formData.title.trim(),
                company: formData.useNewCompany ? formData.newCompany.trim() : formData.company,
                parser: formData.useNewParser ? formData.newParser.trim() : formData.parser,
                country: formData.country.trim() || 'Unknown',
                salary: String(formData.salary || '').trim() || null,
                description: formData.description.trim(),
                href: formData.href.trim() || null,
            }

            if (editJob) {
                jobData.hash = editJob.hash
            }

            const { job, action } = await save(jobData)

            if (job && (action === 'created' || action === 'updated')) {
                onJobAdded?.(job)
                onClose()
            } else if (action === 'unchanged') {
                setError(editJob ? 'No changes detected' : 'Job with this title and company already exists')
            }
        } catch (e) {
            console.error('Failed to save job:', e)
            setError(`Failed to save job: ${e.message}`)
        } finally {
            setSaving(false)
        }
    }

    if (!isOpen) return null

    const companies = filterOptions?.companies || []
    const parsers = filterOptions?.parsers || []

    return (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">{editJob ? 'Edit Job' : 'Add New Job'}</h5>
                        <button
                            type="button"
                            className="btn-close"
                            onClick={onClose}
                            disabled={saving}
                        />
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            {error && (
                                <div className="alert alert-danger">
                                    {error}
                                </div>
                            )}

                            <div className="mb-3">
                                <label className="form-label">Title *</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={formData.title}
                                    onChange={(e) => handleInputChange('title', e.target.value)}
                                    disabled={saving}
                                    required
                                />
                            </div>

                            <div className="row mb-3">
                                <div className="col-6">
                                    <label className="form-label">Company (existing)</label>
                                    <select
                                        className="form-select"
                                        value={formData.company}
                                        onChange={(e) => handleInputChange('company', e.target.value)}
                                        disabled={saving || formData.useNewCompany}
                                    >
                                        <option value="">Select existing company</option>
                                        {companies.map(company => (
                                            <option key={company} value={company}>
                                                {company}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-6">
                                    <label className="form-label">Company (new) *</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={formData.newCompany}
                                        onChange={(e) => handleInputChange('newCompany', e.target.value)}
                                        disabled={saving || (!formData.useNewCompany && formData.company)}
                                        placeholder="Enter new company name"
                                    />
                                </div>
                            </div>

                            <div className="row mb-3">
                                <div className="col-6">
                                    <label className="form-label">Source (existing)</label>
                                    <select
                                        className="form-select"
                                        value={formData.parser}
                                        onChange={(e) => handleInputChange('parser', e.target.value)}
                                        disabled={saving || formData.useNewParser}
                                    >
                                        <option value="">Select existing source</option>
                                        {parsers.map(parser => (
                                            <option key={parser} value={parser}>
                                                {parser}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-6">
                                    <label className="form-label">Source (new) *</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={formData.newParser}
                                        onChange={(e) => handleInputChange('newParser', e.target.value)}
                                        disabled={saving || (!formData.useNewParser && formData.parser)}
                                        placeholder="Enter new source name"
                                    />
                                </div>
                            </div>

                            <div className="row mb-3">
                                <div className="col-6">
                                    <label className="form-label">Country</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={formData.country}
                                        onChange={(e) => handleInputChange('country', e.target.value)}
                                        disabled={saving}
                                        placeholder="e.g. Ukraine, Remote"
                                    />
                                </div>
                                <div className="col-6">
                                    <label className="form-label">Salary</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={formData.salary}
                                        onChange={(e) => handleInputChange('salary', e.target.value)}
                                        disabled={saving}
                                        placeholder="e.g. 3000-5000"
                                    />
                                </div>
                            </div>

                            <div className="mb-3">
                                <label className="form-label">Job URL</label>
                                <input
                                    type="url"
                                    className="form-control"
                                    value={formData.href}
                                    onChange={(e) => handleInputChange('href', e.target.value)}
                                    disabled={saving}
                                    placeholder="https://..."
                                />
                            </div>

                            <div className="mb-3">
                                <label className="form-label">Description (HTML) *</label>
                                <textarea
                                    className="form-control"
                                    rows={8}
                                    value={formData.description}
                                    onChange={(e) => handleInputChange('description', e.target.value)}
                                    disabled={saving}
                                    placeholder="Job description in HTML format..."
                                    style={{ fontFamily: 'monospace', fontSize: '12px' }}
                                    required
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={onClose}
                                disabled={saving}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-success"
                                disabled={saving}
                            >
                                {saving ? 'Saving...' : editJob ? 'Update Job' : 'Save Job'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default AddJobModal