import React from 'react'
import linkedinScript from '../../parser/sources/linkedin2.js?raw'

const LinkedInParser = ({ jobs }) => {
    const handleCopyScript = () => {
        navigator.clipboard.writeText(linkedinScript).then(() => {
            // Could add a toast notification here
        }).catch(err => {
            console.error('Failed to copy script: ', err)
        })
    }

    // Рендер help/instructions коли немає jobs
    if (jobs.length === 0) {
        return (
            <div className="alert alert-info">
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="alert-heading mb-0">LinkedIn Parser Script</h6>
                    <button
                        className="btn btn-outline-primary btn-sm"
                        onClick={handleCopyScript}
                        title="Copy script to clipboard"
                    >
                        📋 Copy Script
                    </button>
                </div>
                <p className="small mb-2">
                    Виконай цей скрипт в консолі браузера на сторінці LinkedIn Jobs:
                </p>
                <pre
                    className="bg-dark text-light p-2 rounded small"
                    style={{ maxHeight: '300px', overflow: 'auto', fontSize: '11px' }}
                >
                    {linkedinScript}
                </pre>
                <p className="small mb-0 mt-2">
                    Після завантаження файлу <code>linkedin_jobs.json</code>, вставте його вміст у поле зліва.
                </p>
            </div>
        )
    }

    // Коли є jobs - повертаємо null, бо jobs рендериться в основному Parser
    return null
}

export default LinkedInParser