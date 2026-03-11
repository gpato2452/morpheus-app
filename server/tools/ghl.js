/**
 * GoHighLevel (GHL) tools
 * Connects to GHL API for CRM operations: contacts, conversations, tasks, pipelines
 */

const GHL_BASE = 'https://services.leadconnectorhq.com'

async function ghlFetch(path, method = 'GET', body = null, cfg) {
  if (!cfg.ghl_api_key) throw new Error('GHL API key not configured')
  const headers = {
    'Authorization': `Bearer ${cfg.ghl_api_key}`,
    'Content-Type': 'application/json',
    'Version': '2021-07-28',
  }
  const opts = { method, headers }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${GHL_BASE}${path}`, opts)
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`GHL API ${res.status}: ${err}`)
  }
  return res.json()
}

function getGHLTools() {
  return [
    {
      type: 'function',
      function: {
        name: 'ghl_search_contacts',
        description: 'Search contacts in GoHighLevel CRM',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search term (name, email, phone)' },
            limit: { type: 'number', description: 'Max results (default 10)' },
          },
          required: ['query'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'ghl_get_contact',
        description: 'Get full contact details from GHL',
        parameters: {
          type: 'object',
          properties: {
            contact_id: { type: 'string', description: 'GHL contact ID' },
          },
          required: ['contact_id'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'ghl_create_contact',
        description: 'Create a new contact in GoHighLevel (REQUIRES APPROVAL)',
        parameters: {
          type: 'object',
          properties: {
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            company_name: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
          },
          required: ['first_name'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'ghl_send_sms',
        description: 'Send an SMS to a contact via GHL (REQUIRES APPROVAL)',
        parameters: {
          type: 'object',
          properties: {
            contact_id: { type: 'string', description: 'GHL contact ID' },
            message: { type: 'string', description: 'SMS message text' },
          },
          required: ['contact_id', 'message'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'ghl_get_conversations',
        description: 'Get recent conversations from GHL inbox',
        parameters: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Max conversations (default 10)' },
          },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'ghl_create_task',
        description: 'Create a task for a contact in GHL (REQUIRES APPROVAL)',
        parameters: {
          type: 'object',
          properties: {
            contact_id: { type: 'string', description: 'GHL contact ID' },
            title: { type: 'string', description: 'Task title' },
            due_date: { type: 'string', description: 'Due date ISO8601' },
            description: { type: 'string' },
          },
          required: ['contact_id', 'title'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'ghl_get_opportunities',
        description: 'Get opportunities (deals) from GHL pipeline',
        parameters: {
          type: 'object',
          properties: {
            pipeline_id: { type: 'string', description: 'Pipeline ID (optional)' },
            limit: { type: 'number' },
          },
        },
      },
    },
  ]
}

// Actions that require approval
const GHL_APPROVAL_REQUIRED = new Set(['ghl_create_contact', 'ghl_send_sms', 'ghl_create_task'])

async function executeGHLTool(name, args, cfg) {
  const locationId = cfg.ghl_location_id

  switch (name) {
    case 'ghl_search_contacts': {
      const data = await ghlFetch(
        `/contacts/?locationId=${locationId}&query=${encodeURIComponent(args.query)}&limit=${args.limit || 10}`,
        'GET', null, cfg
      )
      return { contacts: (data.contacts || []).map(c => ({ id: c.id, name: `${c.firstName} ${c.lastName}`.trim(), email: c.email, phone: c.phone, tags: c.tags })) }
    }

    case 'ghl_get_contact': {
      const data = await ghlFetch(`/contacts/${args.contact_id}`, 'GET', null, cfg)
      return data.contact || data
    }

    case 'ghl_create_contact': {
      const data = await ghlFetch('/contacts/', 'POST', {
        locationId,
        firstName: args.first_name,
        lastName: args.last_name || '',
        email: args.email || '',
        phone: args.phone || '',
        companyName: args.company_name || '',
        tags: args.tags || [],
      }, cfg)
      return { id: data.contact?.id, status: 'created' }
    }

    case 'ghl_send_sms': {
      const data = await ghlFetch('/conversations/messages/', 'POST', {
        type: 'SMS',
        contactId: args.contact_id,
        message: args.message,
      }, cfg)
      return { id: data.id, status: 'sent' }
    }

    case 'ghl_get_conversations': {
      const data = await ghlFetch(
        `/conversations/?locationId=${locationId}&limit=${args.limit || 10}`,
        'GET', null, cfg
      )
      return { conversations: data.conversations || [] }
    }

    case 'ghl_create_task': {
      const data = await ghlFetch(`/contacts/${args.contact_id}/tasks/`, 'POST', {
        title: args.title,
        dueDate: args.due_date || new Date(Date.now() + 86400000).toISOString(),
        description: args.description || '',
        completed: false,
      }, cfg)
      return { id: data.task?.id, status: 'created' }
    }

    case 'ghl_get_opportunities': {
      let path = `/opportunities/search?locationId=${locationId}&limit=${args.limit || 20}`
      if (args.pipeline_id) path += `&pipelineId=${args.pipeline_id}`
      const data = await ghlFetch(path, 'GET', null, cfg)
      return { opportunities: data.opportunities || [] }
    }

    default:
      throw new Error(`Unknown GHL tool: ${name}`)
  }
}

module.exports = { getGHLTools, executeGHLTool, GHL_APPROVAL_REQUIRED }
