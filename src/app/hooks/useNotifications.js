"use client"

import { useState, useCallback } from "react"
import Notification from "../components/ui/notification"

export default function useNotifications() {
  const [notifications, setNotifications] = useState([])

  const addNotification = useCallback((message, type = "info", duration = 5000) => {
    const id = Date.now()
    setNotifications(prev => [...prev, { id, message, type, duration }])
    return id
  }, [])

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id))
  }, [])

  const notificationComponents = notifications.map(notification => (
    <Notification
      key={notification.id}
      type={notification.type}
      message={notification.message}
      duration={notification.duration}
      onClose={() => removeNotification(notification.id)}
    />
  ))

  return {
    notifications,
    addNotification,
    removeNotification,
    notificationComponents
  }
}