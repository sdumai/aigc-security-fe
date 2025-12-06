/* eslint-disable */
/* tslint:disable */

/**
 * Mock Service Worker (2.0.11).
 * @see https://github.com/mswjs/msw
 * - Please do NOT modify this file.
 * - Please do NOT serve this file on production.
 */

const INTEGRITY_CHECKSUM = '223d48bc6b'
const IS_MOCKED_RESPONSE = Symbol('isMockedResponse')
const activeClientIds = new Set()

self.addEventListener('install', function () {
  self.skipWaiting()
})

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('message', async function (event) {
  const clientId = event.source.id

  if (!clientId || !event.data) {
    return
  }

  const allClients = await self.clients.matchAll({
    type: 'window',
  })

  switch (event.data.type) {
    case 'KEEPALIVE_REQUEST': {
      sendToClient(event.source, {
        type: 'KEEPALIVE_RESPONSE',
      })
      break
    }

    case 'INTEGRITY_CHECK_REQUEST': {
      sendToClient(event.source, {
        type: 'INTEGRITY_CHECK_RESPONSE',
        payload: INTEGRITY_CHECKSUM,
      })
      break
    }

    case 'MOCK_ACTIVATE': {
      activeClientIds.add(clientId)

      sendToClient(event.source, {
        type: 'MOCKING_ENABLED',
        payload: true,
      })
      break
    }

    case 'MOCK_DEACTIVATE': {
      activeClientIds.delete(clientId)
      break
    }

    case 'CLIENT_CLOSED': {
      activeClientIds.delete(clientId)

      const remainingClients = allClients.filter((client) => {
        return client.id !== clientId
      })

      // Unregister itself when there are no more clients
      if (remainingClients.length === 0) {
        self.registration.unregister()
      }

      break
    }
  }
})

self.addEventListener('fetch', function (event) {
  const { request } = event
  const requestId = crypto.randomUUID()

  return event.respondWith(
    handleRequest(event, requestId).catch((error) => {
      console.error(
        '[MSW] Failed to mock a "%s" request to "%s": %s',
        request.method,
        request.url,
        error
      )
    })
  )
})

async function handleRequest(event, requestId) {
  const client = await event.target.clients.get(event.clientId)

  if (!client || !activeClientIds.has(client.id)) {
    return fetch(event.request)
  }

  const requestClone = event.request.clone()
  const getOriginalResponse = () => fetch(requestClone)

  sendToClient(client, {
    type: 'REQUEST',
    payload: {
      id: requestId,
      url: event.request.url,
      method: event.request.method,
      headers: Object.fromEntries(event.request.headers.entries()),
      cache: event.request.cache,
      mode: event.request.mode,
      credentials: event.request.credentials,
      destination: event.request.destination,
      integrity: event.request.integrity,
      redirect: event.request.redirect,
      referrer: event.request.referrer,
      referrerPolicy: event.request.referrerPolicy,
      body: await event.request.text(),
      bodyUsed: event.request.bodyUsed,
      keepalive: event.request.keepalive,
    },
  })

  const responseEvent = await waitForResponse(client, requestId)

  if (responseEvent.data.type === 'MOCK_RESPONSE') {
    return new Response(responseEvent.data.payload.body, {
      status: responseEvent.data.payload.status,
      statusText: responseEvent.data.payload.statusText,
      headers: responseEvent.data.payload.headers,
    })
  }

  return getOriginalResponse()
}

function sendToClient(client, message) {
  return client.postMessage(message)
}

function waitForResponse(client, requestId) {
  return new Promise((resolve) => {
    function handleMessage(event) {
      if (event.data && event.data.payload && event.data.payload.id === requestId) {
        resolve(event)
        self.removeEventListener('message', handleMessage)
      }
    }

    self.addEventListener('message', handleMessage)
  })
}


