#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({
  name: 'agentical',
  version: '1.0.0',
});

// ---------------------------------------------------------------------------
// Tool: check_availability
// ---------------------------------------------------------------------------
server.tool(
  'check_availability',
  'Get available time slots for booking a meeting over a date range',
  {
    start_date: z.string().describe('Start date in YYYY-MM-DD format'),
    end_date: z.string().describe('End date in YYYY-MM-DD format'),
    meeting_type: z.string().describe('Meeting type ID (e.g. "intro", "deep-dive")'),
  },
  async ({ start_date, end_date, meeting_type }) => {
    // In production, this calls the REST API or core library directly
    // For now, return the API URL to call
    const dates = [];
    const start = new Date(start_date + 'T12:00:00');
    const end = new Date(end_date + 'T12:00:00');

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dates.push(dateStr);
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          message: `Checking availability for ${meeting_type} from ${start_date} to ${end_date}`,
          dates,
          api_endpoint: `/api/availability?type=${meeting_type}`,
          note: 'Call /api/availability?date=YYYY-MM-DD&type=TYPE for each date to get slots',
        }, null, 2),
      }],
    };
  }
);

// ---------------------------------------------------------------------------
// Tool: book_meeting
// ---------------------------------------------------------------------------
server.tool(
  'book_meeting',
  'Book a meeting at a specific date and time',
  {
    date: z.string().describe('Date in YYYY-MM-DD format'),
    start_hour: z.number().describe('Start time as float hour (e.g. 14 = 2:00 PM, 14.5 = 2:30 PM)'),
    meeting_type: z.string().describe('Meeting type ID (e.g. "intro", "deep-dive")'),
    booker_name: z.string().describe('Name of the person booking'),
    booker_email: z.string().describe('Email of the person booking'),
    notes: z.string().optional().describe('Optional notes for the meeting'),
  },
  async ({ date, start_hour, meeting_type, booker_name, booker_email, notes }) => {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          message: `Booking ${meeting_type} for ${booker_name} on ${date} at ${start_hour}`,
          api_endpoint: '/api/book',
          api_method: 'POST',
          api_body: { meeting_type, date, start_hour, name: booker_name, email: booker_email, notes: notes || '' },
        }, null, 2),
      }],
    };
  }
);

// ---------------------------------------------------------------------------
// Tool: cancel_meeting
// ---------------------------------------------------------------------------
server.tool(
  'cancel_meeting',
  'Cancel an existing booking',
  {
    booking_code: z.string().optional().describe('Booking code (e.g. AC-7K2F)'),
    token: z.string().optional().describe('Magic link token'),
  },
  async ({ booking_code, token }) => {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          message: `Cancelling booking ${booking_code || token}`,
          api_endpoint: '/api/cancel',
          api_method: 'POST',
          api_body: booking_code ? { booking_code } : { token },
        }, null, 2),
      }],
    };
  }
);

// ---------------------------------------------------------------------------
// Tool: reschedule_meeting
// ---------------------------------------------------------------------------
server.tool(
  'reschedule_meeting',
  'Reschedule an existing booking to a new date and time',
  {
    booking_code: z.string().optional().describe('Booking code (e.g. AC-7K2F)'),
    token: z.string().optional().describe('Magic link token'),
    new_date: z.string().describe('New date in YYYY-MM-DD format'),
    new_start_hour: z.number().describe('New start time as float hour'),
  },
  async ({ booking_code, token, new_date, new_start_hour }) => {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          message: `Rescheduling booking to ${new_date} at ${new_start_hour}`,
          api_endpoint: '/api/reschedule',
          api_method: 'POST',
          api_body: {
            ...(booking_code ? { booking_code } : { token }),
            new_date,
            new_start_hour,
          },
        }, null, 2),
      }],
    };
  }
);

// ---------------------------------------------------------------------------
// Tool: get_meeting_types
// ---------------------------------------------------------------------------
server.tool(
  'get_meeting_types',
  'List available meeting types and their durations',
  {},
  async () => {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          message: 'Available meeting types',
          api_endpoint: '/api/meeting-types',
          api_method: 'GET',
        }, null, 2),
      }],
    };
  }
);

// ---------------------------------------------------------------------------
// Tool: send_invite
// ---------------------------------------------------------------------------
server.tool(
  'send_invite',
  'Get the MCP endpoint URL to share with other AI agents for booking',
  {},
  async () => {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          message: 'Share this MCP endpoint with other AI agents to let them book time with you',
          mcp_config: {
            command: 'npx',
            args: ['agentical-mcp'],
          },
          note: 'The other agent adds this to their MCP configuration to discover and use booking tools',
        }, null, 2),
      }],
    };
  }
);

// ---------------------------------------------------------------------------
// Tool: update_theme
// ---------------------------------------------------------------------------
server.tool(
  'update_theme',
  'Apply a custom theme to the calendar page. Themes control colors, fonts, shapes, and effects.',
  {
    theme: z.object({
      name: z.string().describe('Theme name'),
      colors: z.object({
        primary: z.string(),
        'primary-light': z.string(),
        accent: z.string(),
        'accent-light': z.string(),
        background: z.string(),
        surface: z.string(),
        text: z.string(),
        'text-muted': z.string(),
        border: z.string(),
        shadow: z.string(),
        success: z.string(),
        error: z.string(),
      }).describe('Color palette'),
      fonts: z.object({
        body: z.string(),
        heading: z.string(),
        mono: z.string(),
      }).describe('Font families'),
      shape: z.object({
        'card-radius': z.string(),
        'btn-radius': z.string(),
      }).describe('Border radius values'),
      effects: z.object({
        cursor: z.string().optional(),
        'ambient-dots': z.boolean().optional(),
        creatures: z.boolean().optional(),
        'confetti-colors': z.array(z.string()).optional(),
      }).optional().describe('Visual effects configuration'),
    }).describe('Complete theme configuration'),
  },
  async ({ theme }) => {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          message: `Applying theme: ${theme.name}`,
          theme,
          note: 'Theme will be saved to host config and applied on next page load',
        }, null, 2),
      }],
    };
  }
);

// ---------------------------------------------------------------------------
// Tool: set_availability
// ---------------------------------------------------------------------------
server.tool(
  'set_availability',
  'Update the available days, hours, and buffer time for bookings',
  {
    days: z.array(z.number()).describe('Available days (0=Sun, 1=Mon, ..., 6=Sat)'),
    start_hour: z.number().describe('Start of available hours (e.g. 9)'),
    end_hour: z.number().describe('End of available hours (e.g. 17)'),
    buffer_minutes: z.number().describe('Buffer between meetings in minutes (e.g. 15)'),
  },
  async ({ days, start_hour, end_hour, buffer_minutes }) => {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          message: 'Updating availability settings',
          availability: { days, startHour: start_hour, endHour: end_hour, bufferMinutes: buffer_minutes },
          note: 'Settings will be saved to host config',
        }, null, 2),
      }],
    };
  }
);

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Agentical MCP server running');
}

main().catch(console.error);
