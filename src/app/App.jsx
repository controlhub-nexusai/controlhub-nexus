import React, { useEffect, useState } from 'react'
import AppShell from '../components/layout/AppShell'
import JarvisHome from '../components/jarvis/JarvisHome'
import TasksPage from '../components/tasks/TasksPage'
import LeadsPage from '../components/leads/LeadsPage'
import ContentPage from '../components/content/ContentPage'
import SettingsPage from '../components/settings/SettingsPage'
import { ROUTES } from './routes'
import { useTasks } from '../hooks/useTasks'
import { useLeads } from '../hooks/useLeads'
import { useContentIdeas } from '../hooks/useContentIdeas'
import { useGeneratedContent } from '../hooks/useGeneratedContent'
import { addMemory, deleteMemory, loadMemory, updateMemory } from '../services/memoryService'
import { getUserProfile } from '../services/personalizationService'

export default function App() {
  const [activePage, setActivePage] = useState(ROUTES.JARVIS)
  const [memories, setMemories] = useState([])
  const [memoryLoading, setMemoryLoading] = useState(true)
  const [memoryError, setMemoryError] = useState('')
  const [userProfile, setUserProfile] = useState(null)
  const profileCompleted = Boolean(
    (userProfile && !userProfile.isFallback && userProfile.name) ||
    memories.some((memory) => ['role', 'project', 'goal', 'brand_focus', 'focus_area'].includes(memory.key?.toLowerCase()))
  )
  const {
    tasks,
    loading: tasksLoading,
    error: tasksError,
    loadTasks,
    addTask,
    deleteTask,
    toggleTaskStatus,
  } = useTasks()
  const {
    leads,
    loading: leadsLoading,
    error: leadsError,
    loadLeads,
    addLead,
    markContacted,
  } = useLeads()
  const {
    contentIdeas,
    loading: contentLoading,
    error: contentError,
    loadContentIdeas,
    addContentIdea,
    markAsDrafted,
    markAsPublished,
  } = useContentIdeas()
  const {
    generatedContent,
    loading: generatedContentLoading,
    error: generatedContentError,
    addGeneratedContent,
  } = useGeneratedContent()

  const refreshMemory = async () => {
    setMemoryLoading(true)
    setMemoryError('')

    try {
      const loadedMemory = await loadMemory()
      setMemories(loadedMemory)
    } catch (error) {
      console.error('[Nexus Memory] Failed to refresh memory:', error)
      setMemoryError('Memory belum tersambung.')
    } finally {
      setMemoryLoading(false)
    }
  }

  const refreshUserProfile = async () => {
    const profile = await getUserProfile()
    setUserProfile(profile)
  }

  const handleAddMemory = async (key, value, type) => {
    await addMemory(key, value, type)
    await refreshMemory()
  }

  const handleUpdateMemory = async (id, value) => {
    await updateMemory(id, value)
    await refreshMemory()
  }

  const handleDeleteMemory = async (id) => {
    await deleteMemory(id)
    await refreshMemory()
  }

  useEffect(() => {
    refreshMemory()
    refreshUserProfile()
  }, [])

  const navigateToJarvis = () => setActivePage(ROUTES.JARVIS)

  return (
    <AppShell activePage={activePage} onNavigate={setActivePage}>
      {activePage === ROUTES.JARVIS && (
        <JarvisHome
          tasks={tasks}
          leads={leads}
          contentIdeas={contentIdeas}
          generatedContent={generatedContent}
          memories={memories}
          userProfile={userProfile}
          profileCompleted={profileCompleted}
          onboardingReady={!memoryLoading && Boolean(userProfile)}
          onAddTask={addTask}
          onAddLead={addLead}
          onAddContentIdea={addContentIdea}
          onAddGeneratedContent={addGeneratedContent}
          onAddMemory={handleAddMemory}
          onDeleteTask={deleteTask}
          onToggleTask={toggleTaskStatus}
          onMarkLeadContacted={markContacted}
          onMarkContentDrafted={markAsDrafted}
          tasksLoading={tasksLoading}
          tasksError={tasksError}
          onRetryTasks={loadTasks}
          onShowTasks={() => setActivePage(ROUTES.TASKS)}
          onShowLeads={() => setActivePage(ROUTES.LEADS)}
          onShowContent={() => setActivePage(ROUTES.CONTENT)}
          onShowSettings={() => setActivePage(ROUTES.SETTINGS)}
        />
      )}

      {activePage === ROUTES.TASKS && (
        <TasksPage
          tasks={tasks}
          loading={tasksLoading}
          error={tasksError}
          onRetry={loadTasks}
          onToggleTask={toggleTaskStatus}
          onDeleteTask={deleteTask}
          onOpenJarvis={navigateToJarvis}
        />
      )}

      {activePage === ROUTES.LEADS && (
        <LeadsPage
          leads={leads}
          loading={leadsLoading}
          error={leadsError}
          onRetry={loadLeads}
          onMarkContacted={markContacted}
          onOpenJarvis={navigateToJarvis}
        />
      )}

      {activePage === ROUTES.CONTENT && (
        <ContentPage
          ideas={contentIdeas}
          generatedContent={generatedContent}
          loading={contentLoading || generatedContentLoading}
          error={contentError || generatedContentError}
          onRetry={loadContentIdeas}
          onMarkDrafted={markAsDrafted}
          onMarkPublished={markAsPublished}
          onOpenJarvis={navigateToJarvis}
        />
      )}

      {activePage === ROUTES.SETTINGS && (
        <SettingsPage
          userProfile={userProfile}
          memories={memories}
          memoryLoading={memoryLoading}
          memoryError={memoryError}
          onAddMemory={handleAddMemory}
          onUpdateMemory={handleUpdateMemory}
          onDeleteMemory={handleDeleteMemory}
        />
      )}
    </AppShell>
  )
}
