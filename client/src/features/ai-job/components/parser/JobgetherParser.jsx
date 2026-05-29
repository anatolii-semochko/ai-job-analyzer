import React from 'react'

const JobgetherParser = ({ parser, jobs }) => {
    const exampleUrl = "https://jobgether.com/talent/matches"

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(exampleUrl).then(() => {
            // Could add a toast notification here
        }).catch(err => {
            console.error('Failed to copy URL: ', err)
        })
    }

    const handleCopyScript = () => {
        const script = parser?.browserScript || ''
        navigator.clipboard.writeText(script).then(() => {
            // Could add a toast notification here
        }).catch(err => {
            console.error('Failed to copy script: ', err)
        })
    }

    // Рендер help/instructions коли немає jobs
    if (jobs.length === 0) {
        return (
            <div className="alert alert-info">
                <h6 className="alert-heading">Jobgether Parser</h6>
                <p className="small mb-2">
                    <strong>Для повних даних (зарплата, опис, компанія):</strong> встав <strong>URL сторінки</strong> зі списком вакансій.
                    <br />
                    <strong>Для базових даних:</strong> скопіюй HTML (Ctrl+A, Ctrl+C) і встав сюди:
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
                <div className="alert alert-warning mt-3">
                    <strong>Альтернативний метод:</strong>
                    <p className="small mb-1">
                        Якщо HTML парсинг не працює, використовуй browser script:
                    </p>
                    <ol className="small mb-1">
                        <li>Відкрий DevTools (F12) на сторінці Jobgether</li>
                        <li>Перейди в Console</li>
                        <li>Скопіюй і виконай скрипт нижче:</li>
                        <li>Встав JSON результат в поле вище</li>
                    </ol>

                    <div className="mt-2">
                        <div className="d-flex justify-content-between align-items-center">
                            <label className="form-label small mb-0">Browser Script:</label>
                            <button
                                className="btn btn-outline-success btn-sm"
                                onClick={handleCopyScript}
                                title="Copy script to clipboard"
                            >
                                📋 Copy Script
                            </button>
                        </div>
                        <textarea
                            className="form-control small mt-1"
                            readOnly
                            value={parser?.browserScript || 'Loading script...'}
                            style={{
                                height: '120px',
                                fontSize: '10px',
                                fontFamily: 'monospace'
                            }}
                            onClick={(e) => e.target.select()}
                        />
                        <small className="text-muted">Click textarea to select all, or use "Copy Script" button</small>
                    </div>
                </div>
            </div>
        )
    }

    // Коли є jobs - повертаємо null, бо jobs рендериться в основному Parser
    return null
}

export default JobgetherParser