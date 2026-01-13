import { NextRequest } from 'next/server'
import { addClient, removeClient } from '@/lib/sse'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const userId = parseInt(url.searchParams.get('userId') || '0')
    if (!userId) return new Response('User ID required', { status: 400 })

    const stream = new ReadableStream({
      start(controller) {
        const send = (data: string) => {
          try { controller.enqueue(new TextEncoder().encode(data)) } catch (e) { }
        }
        // send a ping to confirm connection
        send('event: ping\ndata: {}\n\n')
        addClient(userId, send)

        // attach send to controller so cancel can access it
        ;(controller as any)._send = send
      },
      cancel() {
        try {
          const send = (this as any)._send
          if (send) removeClient(userId, send)
        } catch (e) {
          // ignore
        }
      }
    })

    const res = new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    })

    return res
  } catch (err) {
    console.error('SSE subscribe error:', err)
    return new Response('Internal server error', { status: 500 })
  }
}
