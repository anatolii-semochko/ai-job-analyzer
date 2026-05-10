import React from 'react'

const ComposedEmailModal = ({ isOpen, onClose, email, isLoading, error }) => {
    if (!isOpen) return null

    const handleCopyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            // Could add a toast notification here
        }).catch(err => {
            console.error('Failed to copy text: ', err)
        })
    }

    const handleCopySubject = () => {
        if (email?.subject) {
            handleCopyToClipboard(email.subject)
        }
    }

    const handleCopyBody = () => {
        if (email?.body) {
            handleCopyToClipboard(email.body)
        }
    }

    const handleCopyAll = () => {
        if (email?.subject && email?.body) {
            const fullEmail = `Subject: ${email.subject}\n\n${email.body}`
            handleCopyToClipboard(fullEmail)
        }
    }

    return (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">
                            📧 Composed Email
                        </h5>
                        <button
                            type="button"
                            className="btn-close"
                            onClick={onClose}
                        ></button>
                    </div>
                    <div className="modal-body">
                        {isLoading && (
                            <div className="text-center p-4">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Composing email...</span>
                                </div>
                                <p className="mt-2">AI is composing your email...</p>
                            </div>
                        )}

                        {error && (
                            <div className="alert alert-danger">
                                <strong>Error:</strong> {error}
                            </div>
                        )}

                        {email && !isLoading && (
                            <>
                                <div className="mb-4">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <label className="form-label fw-bold">Subject:</label>
                                        <button
                                            className="btn btn-outline-secondary btn-sm"
                                            onClick={handleCopySubject}
                                            title="Copy subject to clipboard"
                                        >
                                            📋 Copy
                                        </button>
                                    </div>
                                    <div className="p-3 bg-light rounded border">
                                        {email.subject}
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <label className="form-label fw-bold">Email Body:</label>
                                        <button
                                            className="btn btn-outline-secondary btn-sm"
                                            onClick={handleCopyBody}
                                            title="Copy body to clipboard"
                                        >
                                            📋 Copy
                                        </button>
                                    </div>
                                    <div className="p-3 bg-light rounded border" style={{
                                        whiteSpace: 'pre-wrap',
                                        fontFamily: 'monospace',
                                        maxHeight: '400px',
                                        overflowY: 'auto'
                                    }}>
                                        {email.body}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                        >
                            Close
                        </button>
                        {email && !isLoading && (
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleCopyAll}
                            >
                                📋 Copy All
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ComposedEmailModal