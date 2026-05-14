import React from 'react'

const DjinniParser = ({ parser, jobs }) => {
    // Рендер help/instructions коли немає jobs
    if (jobs.length === 0) {
        const exampleUrl = "https://djinni.co/jobs/"

        const handleCopyUrl = () => {
            navigator.clipboard.writeText(exampleUrl).then(() => {
                // Could add a toast notification here
            }).catch(err => {
                console.error('Failed to copy URL: ', err)
            })
        }

        return (
            <div className="alert alert-info">
                <h6 className="alert-heading">Djinni.co Parser</h6>
                <p className="small mb-2">
                    <strong>Спосіб 1 (рекомендовано):</strong> Встав URL сторінки з вакансіями, наприклад:
                </p>
                <div className="d-flex align-items-center gap-2 mb-2">
                    <pre className="bg-dark text-light p-2 rounded small flex-grow-1 mb-0" style={{ fontSize: '11px' }}>
                        {exampleUrl}
                    </pre>
                    <button
                        className="btn btn-outline-primary btn-sm"
                        onClick={handleCopyUrl}
                        title="Copy example URL to clipboard"
                    >
                        📋 Copy
                    </button>
                </div>
                <p className="small mb-0">
                    <strong>Спосіб 2:</strong> Скопіюй HTML зі сторінки (Ctrl+A, Ctrl+C) і встав сюди.
                </p>
            </div>
        )
    }

    // Коли є jobs - повертаємо null, бо jobs рендериться в основному Parser
    return null
}

export default DjinniParser