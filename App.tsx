/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { RefreshProvider, useRefresh } from './contexts/RefreshContext';
import { Navigation } from './components/Navigation';
import { Sidebar } from './components/Sidebar';
import { Feed } from './pages/Feed';
import { MyFeed } from './pages/MyFeed';
import { WriteJournal } from './pages/WriteJournal';
import { JournalDetail } from './pages/JournalDetail';
import { Chat } from './pages/Chat';
import { Messages } from './pages/Messages';
import { Profile } from './pages/Profile';
import { UserProfile } from './pages/UserProfile';
import { ExperienceMap } from './pages/ExperienceMap';
import { Discovery } from './pages/Discovery';
import { TimeCapsule } from './pages/TimeCapsule';
import { Moments } from './pages/Moments';
import { StreakReminder } from './components/StreakReminder';
import { cn } from './lib/utils';

function AppContent() {
  const { refreshKey } = useRefresh();
  return (
    <div className="min-h-[100dvh] bg-[#F9FAFB] dark:bg-black font-sans selection:bg-gray-200 dark:selection:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <Navigation />
      <Sidebar />
      <StreakReminder />
      <main key={refreshKey} className="pt-16 pb-28 min-h-[100dvh] transition-all">
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/my-feed" element={<MyFeed />} />
          <Route path="/moments" element={<Moments />} />
          <Route path="/write" element={<WriteJournal />} />
          <Route path="/journal/:id" element={<JournalDetail />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/user/:username" element={<UserProfile />} />
          <Route path="/discovery" element={<Discovery />} />
          <Route path="/map" element={<ExperienceMap />} />
          <Route path="/capsule" element={<TimeCapsule />} />
          <Route path="/community/:id" element={<Discovery />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <RefreshProvider>
            <AppContent />
          </RefreshProvider>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
