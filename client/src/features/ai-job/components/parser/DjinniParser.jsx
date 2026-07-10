import React, { useState } from 'react'

const DEFAULT_BATCH_URLS = [
    'https://djinni.co/jobs/?all_keywords=Symfony&search_type=basic-search',
    'https://djinni.co/jobs/?all_keywords=Symfony&search_type=basic-search&page=2',
    'https://djinni.co/jobs/?all_keywords=Node&search_type=basic-search',
    'https://djinni.co/jobs/?all_keywords=Node&search_type=basic-search&page=2',
    'https://djinni.co/jobs/?all_keywords=Solana&search_type=basic-search',
].join('\n')

const DjinniParser = ({ parser, jobs, onBatchParse, fetching, fetchProgress }) => {
    const [batchUrls, setBatchUrls] = useState(DEFAULT_BATCH_URLS)

    // Коли є jobs - повертаємо null, бо jobs рендериться в основному Parser
    if (jobs.length > 0) {
        return null
    }

    const exampleUrl = "https://djinni.co/jobs/"

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(exampleUrl).then(() => {
            // Could add a toast notification here
        }).catch(err => {
            console.error('Failed to copy URL: ', err)
        })
    }

    const handleBatchParseClick = () => {
        const urls = batchUrls.split('\n').map(u => u.trim()).filter(Boolean)
        if (urls.length === 0 || !onBatchParse) return
        onBatchParse(urls)
    }

    const batchButtonLabel = fetching
        ? (fetchProgress?.total > 0
            ? `${fetchProgress.status || 'Processing'} (${fetchProgress.current}/${fetchProgress.total})`
            : 'Processing...')
        : '🔎 Parse All Categories'

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
            <p className="small mb-3">
                <strong>Спосіб 2:</strong> Скопіюй HTML зі сторінки (Ctrl+A, Ctrl+C) і встав сюди.
            </p>

            {onBatchParse && (
                <>
                    <hr />
                    <p className="small mb-2">
                        <strong>Спосіб 3:</strong> Автоматичний парсинг кількох пошукових сторінок одразу — по одному URL на рядок:
                    </p>
                    <textarea
                        className="form-control form-control-sm mb-2"
                        rows={5}
                        value={batchUrls}
                        onChange={(e) => setBatchUrls(e.target.value)}
                        disabled={fetching}
                        style={{ fontFamily: 'monospace', fontSize: '11px', resize: 'vertical' }}
                    />
                    <button
                        className="btn btn-primary btn-sm w-100"
                        onClick={handleBatchParseClick}
                        disabled={fetching || !batchUrls.trim()}
                    >
                        {batchButtonLabel}
                    </button>
                    <p className="small text-muted mb-0 mt-2">
                        Обійде кожен лінк, знайде всі вакансії на ньому та розпарсить кожну окремо через проксі.
                        Використовуй публічні сторінки пошуку (без авторизації) — особистий кабінет/дашборд проксі не зможе відкрити.
                    </p>
                </>
            )}
        </div>
    )
}

export default DjinniParser