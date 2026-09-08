import './layout/GlobalLayout.css'
import './lib/workoutSync.js'
import './lib/fitlifeSync.js'
import React from'react';import{createRoot}from'react-dom/client';import App from'./App';import'./styles.css';
import './styles/responsive-overrides.css'
import AuthGate from './features/auth/AuthGate'
import './lib/fastingSync.js'
createRoot(document.getElementById('root')).render(<React.StrictMode><AuthGate><App/></AuthGate></React.StrictMode>)

import './styles/fitlife-classic.css'

import './features/habits/future-date.css'

import './features/media/media-refinement.css'

import './styles/default-colorful.css'

import './styles/consolidated-comments.css'









import './features/snapshot/SnapshotUnified.css'

import './features/snapshot/SnapshotUnifiedV4.css'

import './features/snapshot/SnapshotUnifiedV5.css'

import './features/snapshot/SnapshotUnifiedV6.css'
