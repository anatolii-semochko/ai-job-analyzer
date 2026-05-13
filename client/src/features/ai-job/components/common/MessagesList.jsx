import React from 'react'

const MessagesList = ({ messages = [], onEditMessage, onDeleteMessage, maxHeight = 500 }) => {
    const getMessageTypeColor = (type) => {
        switch (type) {
            case 'request': return 'bg-primary bg-opacity-10 border-primary'
            case 'response': return 'bg-success bg-opacity-10 border-success'
            case 'comment': return 'bg-warning bg-opacity-10 border-warning'
            default: return 'bg-light border-secondary'
        }
    }

    const getMessageTypeLabel = (type) => {
        switch (type) {
            case 'request': return 'Request'
            case 'response': return 'Response'
            case 'comment': return 'Comment'
            default: return type
        }
    }

    const getBadgeColor = (type) => {
        switch (type) {
            case 'request': return 'bg-primary'
            case 'response': return 'bg-success'
            case 'comment': return 'bg-warning text-dark'
            default: return 'bg-secondary'
        }
    }

    if (messages.length === 0) {
        return null
    }

    return (
        <div>
            <div style={{ maxHeight: `${maxHeight}px`, overflowY: 'auto', minHeight: 'fit-content' }}>
                {messages.map((message, index) => (
                    <div
                        key={`${message.timestamp}-${index}`}
                        className={`border rounded p-3 mb-2 ${getMessageTypeColor(message.type)}`}
                    >
                        <div className="d-flex justify-content-between align-items-start">
                            <div className="flex-grow-1">
                                <div className="d-flex align-items-center mb-2">
                                    <span className={`badge ${getBadgeColor(message.type)} me-2`}>
                                        {getMessageTypeLabel(message.type)}
                                    </span>
                                    <small className="text-muted">
                                        {new Date(message.timestamp).toLocaleDateString('uk-UA', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </small>
                                </div>
                                <div className="small" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                    {message.text}
                                </div>
                            </div>
                            <div className="d-flex gap-1 ms-2 flex-shrink-0">
                                <button
                                    className="btn btn-outline-secondary btn-sm"
                                    onClick={() => onEditMessage(message)}
                                    title="Edit message"
                                    style={{ width: '28px', height: '28px', padding: '0' }}
                                >
                                    ✏️
                                </button>
                                <button
                                    className="btn btn-outline-danger btn-sm"
                                    onClick={() => onDeleteMessage(message)}
                                    title="Delete message"
                                    style={{ width: '28px', height: '28px', padding: '0' }}
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default MessagesList