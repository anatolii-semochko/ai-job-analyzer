import React, { useState, useEffect, useCallback } from 'react'
import Contacted from './components/Contacted'
import Favorites from './components/Favorites'
import Jobs from './components/Jobs'
import Hidden from './components/Hidden'
import Requested from './components/Requested'
import Observing from "./components/Observing"
import Refused from './components/Refused'
import Parser from './components/Parser'
import Settings from './components/Settings'
import { getStats } from './service/jobService'

const tabs = [
    { id: 'jobs', label: 'Unsorted', statKey: 'jobs', component: Jobs },
    { id: 'observing', label: 'Observing', statKey: 'observing', component: Observing },
    { id: 'favorites', label: 'Favorites', statKey: 'favorites', component: Favorites },
    { id: 'requested', label: 'Requested', statKey: 'requested', component: Requested },
    { id: 'contacted', label: 'Contacted', statKey: 'contacted', component: Contacted },
    { id: 'refused', label: 'Refused', statKey: 'refused', component: Refused },
    { id: 'hidden', label: 'Hidden', statKey: 'hidden', component: Hidden },
    { id: 'parser', label: 'Parser', statKey: null, component: Parser },
    { id: 'settings', label: 'Settings', statKey: null, component: Settings },
]

const AiJob = () => {
    const [activeTab, setActiveTab] = useState(() => {
        return localStorage.getItem('aiJob_activeTab') || 'jobs'
    })
    const [stats, setStats] = useState({ jobs: 0, favorites: 0, requested: 0, contacted: 0, refused: 0, hidden: 0 })
    const [selectedItems, setSelectedItems] = useState([])

    const loadStats = useCallback(async () => {
        try {
            const data = await getStats()
            setStats(data)
        } catch (e) {
            console.error('Failed to load stats:', e)
        }
    }, [])

    useEffect(() => {
        loadStats()
    }, [loadStats])

    useEffect(() => {
        loadStats()
    }, [activeTab, loadStats])

    useEffect(() => {
        setSelectedItems([])
        localStorage.setItem('aiJob_activeTab', activeTab)
    }, [activeTab])

    const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component

    const isTableTab = ['jobs', 'favorites', 'requested', 'contacted', 'refused', 'hidden'].includes(activeTab)

    return (
        <div className="row px-3">
            <div className="col-12 d-flex flex-column" style={{ height: 'calc(100vh - 40px)' }}>
                <ul className="nav nav-tabs mb-3 flex-shrink-0">
                    {tabs.map(tab => (
                        <li key={tab.id} className="nav-item">
                            <button
                                className={`nav-link ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                {tab.label}
                                {tab.statKey && stats[tab.statKey] > 0 && (
                                    <span className="badge bg-secondary ms-2">
                                        {stats[tab.statKey]}
                                    </span>
                                )}
                            </button>
                        </li>
                    ))}
                </ul>

                <div
                    className="tab-content flex-grow-1"
                    style={{
                        overflow: isTableTab ? 'hidden' : 'hidden auto',
                        height: isTableTab ? '100%' : 'auto',
                        minHeight: 0
                    }}
                >
                    {ActiveComponent && (
                        <ActiveComponent
                            onUpdate={loadStats}
                            selectedItems={selectedItems}
                            onSelectionChange={setSelectedItems}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}

export default AiJob
