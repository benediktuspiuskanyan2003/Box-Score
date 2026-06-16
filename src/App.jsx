import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Auth
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';

// Pages - Phase 2 MVP (New Home Dashboard)
import { Home } from './pages/Home';

// Pages - Fase 1 (Score Tracker)
import { CreateGroup } from './pages/CreateGroup';
import { JoinGroup } from './pages/JoinGroup';
import { GroupCode } from './pages/GroupCode';
import { Game } from './pages/Game';
import { RoundInput } from './pages/RoundInput';
import { History } from './pages/History';
import { Stats } from './pages/Stats';
import { Rules } from './pages/Rules';
import { MyGroups } from './pages/MyGroups';

// Pages - Fase 2 (Game Engine)
import { PlaySetup } from './pages/PlaySetup';
import { PlayGame } from './pages/PlayGame';

// New Pages - Phase 2 MVP
import { EditProfile } from './pages/EditProfile';
import { Settings } from './pages/Settings';
import { BoxTracker } from './pages/BoxTracker';
import { Multiplayer } from './pages/Multiplayer';
import { WaitingRoom } from './pages/WaitingRoom';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-center" />
        <Routes>
          {/* Auth Routes - Public */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />

          {/* Phase 2 MVP - Protected */}
          <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/box-tracker" element={<ProtectedRoute><BoxTracker /></ProtectedRoute>} />
          <Route path="/multiplayer" element={<ProtectedRoute><Multiplayer /></ProtectedRoute>} />
          <Route path="/waiting-room/:roomCode" element={<ProtectedRoute><WaitingRoom /></ProtectedRoute>} />

          {/* Fase 1 - Score Tracker - Protected */}
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/create" element={<ProtectedRoute><CreateGroup /></ProtectedRoute>} />
          <Route path="/join" element={<ProtectedRoute><JoinGroup /></ProtectedRoute>} />
          <Route path="/mygroups" element={<ProtectedRoute><MyGroups /></ProtectedRoute>} />
          <Route path="/group/:code" element={<ProtectedRoute><GroupCode /></ProtectedRoute>} />
          <Route path="/game/:groupCode" element={<ProtectedRoute><Game /></ProtectedRoute>} />
          <Route path="/game/:groupCode/round" element={<ProtectedRoute><RoundInput /></ProtectedRoute>} />
          <Route path="/game/:groupCode/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
          <Route path="/game/:groupCode/stats" element={<ProtectedRoute><Stats /></ProtectedRoute>} />
          <Route path="/rules" element={<ProtectedRoute><Rules /></ProtectedRoute>} />

          {/* Fase 2 - Game Engine - Protected */}
          <Route path="/play/setup" element={<ProtectedRoute><PlaySetup /></ProtectedRoute>} />
          <Route path="/play/game/:roomId" element={<ProtectedRoute><PlayGame /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/home" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

