import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Pages - Fase 1 (Score Tracker)
import { Home } from './pages/Home';
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

function App() {
  return (
    <Router>
      <Routes>
        {/* Fase 1 - Score Tracker */}
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<CreateGroup />} />
        <Route path="/join" element={<JoinGroup />} />
        <Route path="/mygroups" element={<MyGroups />} />
        <Route path="/group/:code" element={<GroupCode />} />
        <Route path="/game/:groupCode" element={<Game />} />
        <Route path="/game/:groupCode/round" element={<RoundInput />} />
        <Route path="/game/:groupCode/history" element={<History />} />
        <Route path="/game/:groupCode/stats" element={<Stats />} />
        <Route path="/rules" element={<Rules />} />

        {/* Fase 2 - Game Engine */}
        <Route path="/play/setup" element={<PlaySetup />} />
        <Route path="/play/game" element={<PlayGame />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
