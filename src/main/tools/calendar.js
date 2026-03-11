const { google } = require('googleapis')
const { buildAuthClient } = require('./google-auth')
const settings = require('../settings')

function getCalendarClient(tokens) {
  const cfg = settings.get()
  const auth = buildAuthClient(tokens, cfg)
  return google.calendar({ version: 'v3', auth })
}

function getCalendarTools() {
  return [
    {
      type: 'function',
      function: {
        name: 'calendar_list',
        description: 'List upcoming calendar events',
        parameters: {
          type: 'object',
          properties: {
            days_ahead: { type: 'number', description: 'How many days ahead to look (default 7)' },
            max_results: { type: 'number', description: 'Max events to return (default 10)' },
          },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'calendar_check_availability',
        description: 'Check if a time slot is free',
        parameters: {
          type: 'object',
          properties: {
            start: { type: 'string', description: 'Start datetime ISO8601' },
            end: { type: 'string', description: 'End datetime ISO8601' },
          },
          required: ['start', 'end'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'calendar_create',
        description: 'Create a calendar event (REQUIRES USER APPROVAL)',
        parameters: {
          type: 'object',
          properties: {
            summary: { type: 'string', description: 'Event title' },
            start: { type: 'string', description: 'Start datetime ISO8601' },
            end: { type: 'string', description: 'End datetime ISO8601' },
            description: { type: 'string', description: 'Event description' },
            attendees: { type: 'array', items: { type: 'string' }, description: 'List of attendee emails' },
          },
          required: ['summary', 'start', 'end'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'calendar_update',
        description: 'Update an existing calendar event (REQUIRES USER APPROVAL)',
        parameters: {
          type: 'object',
          properties: {
            event_id: { type: 'string', description: 'Event ID to update' },
            summary: { type: 'string' },
            start: { type: 'string' },
            end: { type: 'string' },
            description: { type: 'string' },
          },
          required: ['event_id'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'calendar_delete',
        description: 'Delete a calendar event (REQUIRES USER APPROVAL)',
        parameters: {
          type: 'object',
          properties: {
            event_id: { type: 'string', description: 'Event ID to delete' },
          },
          required: ['event_id'],
        },
      },
    },
  ]
}

async function executeCalendarTool(name, args, tokens) {
  const calendar = getCalendarClient(tokens)

  switch (name) {
    case 'calendar_list': {
      const now = new Date()
      const future = new Date()
      future.setDate(future.getDate() + (args.days_ahead || 7))

      const res = await calendar.events.list({
        calendarId: 'primary',
        timeMin: now.toISOString(),
        timeMax: future.toISOString(),
        maxResults: args.max_results || 10,
        singleEvents: true,
        orderBy: 'startTime',
      })

      return {
        events: (res.data.items || []).map(e => ({
          id: e.id,
          summary: e.summary,
          start: e.start.dateTime || e.start.date,
          end: e.end.dateTime || e.end.date,
          description: e.description,
          attendees: (e.attendees || []).map(a => a.email),
        })),
      }
    }

    case 'calendar_check_availability': {
      const res = await calendar.freebusy.query({
        requestBody: {
          timeMin: args.start,
          timeMax: args.end,
          items: [{ id: 'primary' }],
        },
      })
      const busy = res.data.calendars.primary.busy || []
      return { available: busy.length === 0, busy_periods: busy }
    }

    case 'calendar_create': {
      const event = {
        summary: args.summary,
        start: { dateTime: args.start, timeZone: 'America/Mexico_City' },
        end: { dateTime: args.end, timeZone: 'America/Mexico_City' },
        description: args.description || '',
        attendees: (args.attendees || []).map(email => ({ email })),
      }
      const res = await calendar.events.insert({ calendarId: 'primary', requestBody: event })
      return { id: res.data.id, status: 'created', link: res.data.htmlLink }
    }

    case 'calendar_update': {
      const existing = await calendar.events.get({ calendarId: 'primary', eventId: args.event_id })
      const updated = {
        ...existing.data,
        summary: args.summary || existing.data.summary,
        description: args.description || existing.data.description,
        start: args.start ? { dateTime: args.start } : existing.data.start,
        end: args.end ? { dateTime: args.end } : existing.data.end,
      }
      await calendar.events.update({ calendarId: 'primary', eventId: args.event_id, requestBody: updated })
      return { status: 'updated' }
    }

    case 'calendar_delete': {
      await calendar.events.delete({ calendarId: 'primary', eventId: args.event_id })
      return { status: 'deleted' }
    }

    default:
      throw new Error(`Unknown calendar tool: ${name}`)
  }
}

module.exports = { getCalendarTools, executeCalendarTool }
