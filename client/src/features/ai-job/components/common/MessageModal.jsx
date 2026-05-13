import React, { useState, useEffect } from 'react'

const MessageModal = ({ isOpen, onClose, onAddMessage, editMessage = null }) => {
    const [messageType, setMessageType] = useState('request')
    const [messageText, setMessageText] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (editMessage) {
            setMessageType(editMessage.type)
            setMessageText(editMessage.text)
        } else {
            setMessageType('request')
            setMessageText('')
        }
    }, [editMessage])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!messageText.trim()) return

        setSaving(true)
        try {
            const message = {
                type: messageType,
                text: messageText.trim(),
                timestamp: editMessage?.timestamp || new Date().toISOString(),
            }

            await onAddMessage(message, editMessage)

            if (!editMessage) {
                setMessageText('')
                setMessageType('request')
            }
            onClose()
        } catch (error) {
            console.error('Failed to save message:', error)
        } finally {
            setSaving(false)
        }
    }

    const handleClose = () => {
        if (!editMessage) {
            setMessageText('')
            setMessageType('request')
        }
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">
                            {editMessage ? 'Edit Message' : 'Add Message'}
                        </h5>
                        <button
                            type="button"
                            className="btn-close"
                            onClick={handleClose}
                        ></button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <div className="mb-3">
                                <label htmlFor="messageType" className="form-label">Message Type</label>
                                <select
                                    id="messageType"
                                    name="message.type"
                                    className="form-select"
                                    value={messageType}
                                    onChange={(e) => setMessageType(e.target.value)}
                                    required
                                >
                                    <option value="request">Request</option>
                                    <option value="response">Response</option>
                                    <option value="comment">Comment</option>
                                </select>
                            </div>
                            <div className="mb-3">
                                <label htmlFor="messageText" className="form-label">Message</label>
                                <textarea
                                    id="messageText"
                                    name="message.text"
                                    className="form-control"
                                    rows="20"
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    placeholder="Enter your message..."
                                    required
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={handleClose}
                                disabled={saving}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={saving || !messageText.trim()}
                            >
                                {saving ? 'Saving...' : editMessage ? 'Update' : 'Add Message'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default MessageModal