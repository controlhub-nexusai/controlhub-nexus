import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function normalizeTask(task) {
  return {
    id: task.id,
    title: task.title,
    category: task.category,
    status: task.status,
    priority: task.priority,
    dueDate: task.due_date,
    dueTime: task.due_time?.slice(0, 5),
    reminderMinutes: task.reminder_minutes,
    createdAt: task.created_at,
  }
}

function toTaskRow(task) {
  return Object.fromEntries(
    Object.entries({
      title: task.title,
      category: task.category,
      status: task.status,
      priority: task.priority,
      due_date: task.dueDate,
      due_time: task.dueTime,
      reminder_minutes: task.reminderMinutes,
    }).filter(([, value]) => value !== undefined)
  )
}

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase client is not configured.')
  }
}

export function useTasks() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadTasks = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      requireSupabase()

      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('id,title,category,status,priority,due_date,due_time,reminder_minutes,created_at')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setTasks((data || []).map(normalizeTask))
    } catch (err) {
      console.error('[Nexus Tasks] Failed to load tasks:', err)
      setError('Periksa koneksi database.')
    } finally {
      setLoading(false)
    }
  }, [])

  const addTask = async ({
    title,
    category = 'personal',
    status = 'pending',
    priority = 'medium',
    dueDate,
    dueTime,
    reminderMinutes,
  }) => {
    setError('')

    try {
      requireSupabase()

      const payload = toTaskRow({
        title,
        category,
        status,
        priority,
        dueDate,
        dueTime,
        reminderMinutes,
      })

      console.log('Insert payload:', payload)

      const { data, error: insertError } = await supabase
        .from('tasks')
        .insert(payload)
        .select('id,title,category,status,priority,due_date,due_time,reminder_minutes,created_at')
        .single()

      if (insertError) {
        console.error('Supabase insert error:', insertError)
        throw insertError
      }

      const normalizedTask = normalizeTask(data)
      const { count, error: countError } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .neq('status', 'completed')

      if (countError) {
        console.error('[Nexus Tasks] Failed to count active tasks:', countError)
      }

      await loadTasks()
      return {
        ...normalizedTask,
        activeTaskCount: count ?? undefined,
      }
    } catch (err) {
      console.error('Supabase insert error:', err)
      console.error('[Nexus Tasks] Failed to add task:', {
        message: err.message,
        details: err.details,
        hint: err.hint,
        code: err.code,
        error: err,
      })
      setError('Task belum tersimpan.')
      throw err
    }
  }

  const updateTask = async (taskId, updates) => {
    setError('')

    try {
      requireSupabase()

      const { error: updateError } = await supabase
        .from('tasks')
        .update(toTaskRow(updates))
        .eq('id', taskId)

      if (updateError) throw updateError
      await loadTasks()
    } catch (err) {
      console.error('[Nexus Tasks] Failed to update task:', err)
      setError('Task gagal diperbarui.')
      throw err
    }
  }

  const deleteTask = async (taskId) => {
    setError('')

    try {
      requireSupabase()

      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (deleteError) throw deleteError
      await loadTasks()
    } catch (err) {
      console.error('[Nexus Tasks] Failed to delete task:', err)
      setError('Task gagal diperbarui.')
      throw err
    }
  }

  const toggleTaskStatus = async (taskId, currentStatus) => {
    await updateTask(taskId, {
      status: currentStatus === 'completed' ? 'pending' : 'completed',
    })
  }

  const toggleTask = async (taskId, currentStatus) => {
    const status = currentStatus || tasks.find((item) => item.id === taskId)?.status
    if (!status) return

    await toggleTaskStatus(taskId, status)
  }

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  return {
    tasks,
    loading,
    error,
    loadTasks,
    getTasks: loadTasks,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskStatus,
    toggleTask,
  }
}
