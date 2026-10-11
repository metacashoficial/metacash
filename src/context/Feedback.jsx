import { createContext, useCallback, useContext, useRef, useState } from 'react'
import Icon from '../components/Icon'
import { Button, Modal } from '../components/ui'

const FeedbackContext = createContext(null)

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [dialog, setDialog] = useState(null)
  const resolver = useRef(null)
  const seq = useRef(0)

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const toast = useCallback(
    (message, { tone = 'success', title, duration = 3800 } = {}) => {
      const id = ++seq.current
      setToasts((t) => [...t.slice(-3), { id, message, tone, title }])
      setTimeout(() => dismiss(id), duration)
    },
    [dismiss]
  )

  const confirm = useCallback(
    (opts) =>
      new Promise((resolve) => {
        resolver.current = resolve
        setDialog(opts)
      }),
    []
  )

  const close = (value) => {
    resolver.current?.(value)
    resolver.current = null
    setDialog(null)
  }

  const icons = { success: 'check', error: 'alert', info: 'info', reminder: 'bell' }

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`} onClick={() => dismiss(t.id)}>
            <span className="toast-icon">
              <Icon name={icons[t.tone] || 'info'} size={16} strokeWidth={2} />
            </span>
            <div>
              {t.title && <strong>{t.title}</strong>}
              <p>{t.message}</p>
            </div>
          </div>
        ))}
      </div>
      <Modal
        open={!!dialog}
        onClose={() => close(false)}
        title={dialog?.title || '¿Estás seguro?'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => close(false)}>
              {dialog?.cancelText || 'Cancelar'}
            </Button>
            <Button variant={dialog?.danger ? 'danger' : 'primary'} onClick={() => close(true)} data-autofocus>
              {dialog?.confirmText || 'Confirmar'}
            </Button>
          </>
        }
      >
        <p className="dialog-text">{dialog?.message}</p>
      </Modal>
    </FeedbackContext.Provider>
  )
}

export const useFeedback = () => useContext(FeedbackContext)
