import React from 'react'

const JobRightParser = ({ parser, jobs }) => {
    const exampleUrl = "https://jobright.ai/jobs/recommend"

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(exampleUrl).then(() => {
            // Could add a toast notification here
        }).catch(err => {
            console.error('Failed to copy URL: ', err)
        })
    }

    // Рендер help/instructions коли немає jobs
    if (jobs.length === 0) {
        return (
            <div className="alert alert-info">
                <h6 className="alert-heading">JobRight.AI Parser</h6>
                <p className="small mb-2">
                    Відкрий сторінку JobRight, скопіюй HTML сторінки (Ctrl+A, Ctrl+C) і встав сюди:
                </p>
                <div className="d-flex align-items-center gap-2 mb-2">
                    <pre className="bg-dark text-light p-2 rounded small flex-grow-1 mb-0" style={{ fontSize: '11px' }}>
                        {exampleUrl}
                    </pre>
                    <button
                        className="btn btn-outline-primary btn-sm"
                        onClick={handleCopyUrl}
                        title="Copy URL to clipboard"
                    >
                        📋 Copy
                    </button>
                </div>
            </div>
        )
    }

    // Коли є jobs - повертаємо null, бо jobs рендериться в основному Parser
    return null
}

export default JobRightParser