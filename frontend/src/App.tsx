import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@store/authStore';
import Login from '@pages/Login';
import DashboardLayout from '@components/layouts/DashboardLayout';
import Dashboard from '@pages/Dashboard';
import TicketList from '@pages/tickets/TicketList';
import TicketDetail from '@pages/tickets/TicketDetail';
import TicketCreate from '@pages/tickets/TicketCreate';
import KnowledgeList from '@pages/knowledge/KnowledgeList';
import KnowledgeDetail from '@pages/knowledge/KnowledgeDetail';
import KnowledgeEditor from '@pages/knowledge/KnowledgeEditor';
import ApprovalList from '@pages/approvals/ApprovalList';
import M365TaskList from '@pages/m365/M365TaskList';
import AuditLogs from '@pages/AuditLogs';
import Profile from '@pages/Profile';
import NotFound from '@pages/NotFound';
import AIChat from '@pages/ai/AIChat';
import AISearchPage from '@pages/ai/AISearchPage';
import AIAnalyze from '@pages/ai/AIAnalyze';
import AIRecommend from '@pages/ai/AIRecommend';
import SLAPage from '@pages/SLAPage';
import './App.css';

function App() {
  const { token, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (!token) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tickets" element={<TicketList />} />
        <Route path="/tickets/new" element={<TicketCreate />} />
        <Route path="/tickets/:id" element={<TicketDetail />} />
        <Route path="/ai/chat" element={<AIChat />} />
        <Route path="/ai/search" element={<AISearchPage />} />
        <Route path="/ai/analyze" element={<AIAnalyze />} />
        <Route path="/ai/recommend" element={<AIRecommend />} />
        <Route path="/knowledge" element={<KnowledgeList />} />
        <Route path="/knowledge/new" element={<KnowledgeEditor />} />
        <Route path="/knowledge/edit/:id" element={<KnowledgeEditor />} />
        <Route path="/knowledge/:id" element={<KnowledgeDetail />} />
        <Route path="/approvals" element={<ApprovalList />} />
        <Route path="/m365/tasks" element={<M365TaskList />} />
        <Route path="/sla" element={<SLAPage />} />
        <Route path="/audit-logs" element={<AuditLogs />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </DashboardLayout>
  );
}

export default App;
