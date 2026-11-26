import { useCallback, useEffect, useRef, useState } from 'react'
import type { LiveRoom } from '../services/liveClassService'

type MeetingStatus = 'connecting' | 'ready' | 'closed' | 'failed'

// Component View owns one client per document. A new room waits for the old client to be destroyed.
let previousCleanup = Promise.resolve()

function isMobileDevice() {
  const agent = navigator.userAgent
  return /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(agent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function useZoomMeeting(room: LiveRoom | null) {
  const rootRef = useRef<HTMLDivElement>(null)
  const endMeetingRef = useRef<(() => Promise<unknown>) | null>(null)
  const [mobile] = useState(isMobileDevice)
  const [status, setStatus] = useState<MeetingStatus>('connecting')

  useEffect(() => {
    const root = rootRef.current
    if (!room?.embedded || mobile || !root) return

    let disposed = false
    let disconnect: (() => Promise<void>) | undefined
    const release = () => {
      if (!disconnect) return
      const teardown = disconnect
      disconnect = undefined
      previousCleanup = teardown().catch(() => undefined)
    }

    const connect = async () => {
      if (disposed) return
      const { default: ZoomMtgEmbedded } = await import('@hocluc/zoom-meeting-sdk')
      if (disposed) return

      const { signature, meetingNumber, passcode, userName, userEmail, role, zak, registrantToken } = room
      if (!signature || !meetingNumber || !userName || role === null || (role === 1 && !zak)) {
        throw new Error('Missing Zoom meeting credentials')
      }

      const client = ZoomMtgEmbedded.createClient()
      let joinStarted = false
      let closed = false
      const videoSize = () => ({ width: root.clientWidth, height: root.clientHeight })
      const observer = new ResizeObserver(() => {
        const size = videoSize()
        if (!disposed && !closed && size.width && size.height) {
          client.updateVideoOptions({ viewSizes: { default: size } })
        }
      })
      const onConnectionChange = ({ state }: { state: string }) => {
        if (state !== 'Closed' || disposed) return
        closed = true
        endMeetingRef.current = null
        setStatus('closed')
      }
      const init = Promise.resolve().then(() => client.init({
        zoomAppRoot: root,
        language: 'vi-VN',
        patchJsMedia: true,
        leaveOnPageUnload: true,
        customize: {
          video: {
            isResizable: false,
            popper: { anchorPosition: { top: 0, left: 0 }, disableDraggable: true },
            viewSizes: { default: videoSize() },
          },
        },
      }))
      disconnect = async () => {
        observer.disconnect()
        endMeetingRef.current = null
        try {
          await init.catch(() => undefined)
          if (joinStarted) {
            client.off('connection-change', onConnectionChange)
            if (!closed) await client.leaveMeeting()
          }
        } finally {
          ZoomMtgEmbedded.destroyClient()
        }
      }
      await init
      if (disposed) return

      client.on('connection-change', onConnectionChange)
      joinStarted = true
      await client.join({
        signature,
        meetingNumber,
        password: passcode ?? '',
        userName,
        userEmail: userEmail ?? undefined,
        zak: role === 1 ? zak ?? undefined : undefined,
        tk: registrantToken ?? undefined,
      })
      if (disposed || closed) return

      observer.observe(root)
      if (role === 1) endMeetingRef.current = () => client.endMeeting()
      setStatus('ready')
    }

    void previousCleanup.then(connect).catch(() => {
      if (!disposed) setStatus('failed')
      release()
    })

    return () => {
      disposed = true
      release()
    }
  }, [mobile, room])

  const endZoomMeeting = useCallback(async () => {
    await endMeetingRef.current?.()
  }, [])

  return { rootRef, mobile, status, endZoomMeeting }
}
