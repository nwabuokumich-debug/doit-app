import { useState, useEffect } from 'react'

const KEY = 'doit_task_templates'

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || [] }
  catch { return [] }
}

export function useTemplates() {
  const [templates, setTemplates] = useState(load)

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(templates))
  }, [templates])

  const saveTemplate = ({ title, description, priority }) => {
    if (!title.trim()) return
    // Avoid exact duplicates
    setTemplates(prev => {
      if (prev.some(t => t.title === title.trim() && t.priority === priority)) return prev
      return [...prev, { id: Date.now(), title: title.trim(), description: description || '', priority }]
    })
  }

  const deleteTemplate = (id) => {
    setTemplates(prev => prev.filter(t => t.id !== id))
  }

  return { templates, saveTemplate, deleteTemplate }
}
