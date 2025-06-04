"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"

export default function Notification({ type = "info", message, duration = 3000, onClose }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (duration) {
      const timer = setTimeout(() => {
        setVisible(false)
        if (onClose) onClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const handleClose = () => {
    setVisible(false)
    if (onClose) onClose()
  }

  if (!visible) return null

  const bgColor = {
    success: "bg-green-50 border-green-400 text-green-700",
    error: "bg-red-50 border-red-400 text-red-700",
    warning: "bg-yellow-50 border-yellow-400 text-yellow-700",
    info: "bg-blue-50 border-blue-400 text-blue-700"
  }[type]

  return (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded shadow-md border ${bgColor} max-w-md animate-fade-in`}>
      <div className="flex items-start">
        <div className="flex-1">{message}</div>
        <button
          onClick={handleClose}
          className="ml-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4 cursor-pointer" />
        </button>
      </div>
    </div>
  )
}