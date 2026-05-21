import React from 'react'

const WorkUAParser = ({ parser, jobs }) => {
    const handleCopyScript = () => {
        navigator.clipboard.writeText(parser.browserScript).then(() => {
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
                    <h6 className="alert-heading mb-0">Work.UA Parser Script</h6>
                    <button
                        className="btn btn-outline-primary btn-sm"
                        onClick={handleCopyScript}
                        title="Copy script to clipboard"
                    >
                        📋 Copy Script
                    </button>
                </div>
                <p className="small mb-2">
                    Виконай цей скрипт в консолі браузера на сторінці Work.ua з вакансіями:
                </p>
                <div className="d-flex align-items-center gap-2 mb-2">
                    <pre className="bg-dark text-light p-2 rounded small flex-grow-1 mb-0" style={{ fontSize: '11px' }}>
                        https://www.work.ua/jobseeker/my/personal-feed/
                    </pre>
                    <button
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => navigator.clipboard.writeText('https://www.work.ua/jobseeker/my/personal-feed/')}
                        title="Copy URL to clipboard"
                    >
                        📋 Copy
                    </button>
                </div>
                <pre
                    className="bg-dark text-light p-2 rounded small"
                    style={{ maxHeight: '300px', overflow: 'auto', fontSize: '11px' }}
                >
                    {parser.browserScript}
                </pre>
                <p className="small mb-0 mt-2">
                    Скрипт автоматично завантажить деталі всіх вакансій та створить JSON файл для завантаження.
                    Після завантаження файлу, скопіюй його вміст і встав у поле вводу вище.
                </p>
            </div>
        )
    }

    // Коли є jobs - повертаємо null, бо jobs рендериться в основному Parser
    return null
}

export default WorkUAParser