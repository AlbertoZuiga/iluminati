import { useCallback, useEffect, useState } from "react"

// Mensaje de éxito efímero: se limpia solo tras `timeout` ms (default 3000).
export default function useFeedback(timeout = 3000) {
  const [success, setSuccess] = useState("")

  useEffect(() => {
    if (!success) return
    const t = setTimeout(() => setSuccess(""), timeout)
    return () => clearTimeout(t)
  }, [success, timeout])

  const showSuccess = useCallback((msg) => setSuccess(msg), [])

  return { success, showSuccess }
}
