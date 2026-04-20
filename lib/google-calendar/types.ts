export type GoogleCalendarScope =
  | 'openid'
  | 'email'
  | 'profile'
  | 'https://www.googleapis.com/auth/calendar.readonly'
  | 'https://www.googleapis.com/auth/calendar.events';

export type GoogleCalendarListEntry = {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  accessRole?: 'owner' | 'writer' | 'reader' | 'freeBusyReader' | string;
  timeZone?: string;
  backgroundColor?: string;
  foregroundColor?: string;
};

export type GoogleCalendarEventResource = {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  start?: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  end?: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
};

export type GoogleScheduleEvent = {
  id: string;
  title: string;
  status: string;
  location: string | null;
  htmlLink: string | null;
  isAllDay: boolean;
  startDate: string | null;
  endDate: string | null;
  startDateTime: string | null;
  endDateTime: string | null;
};

export type GoogleCalendarIntegrationSummary = {
  configured: boolean;
  connected: boolean;
  isActive: boolean;
  accountEmail: string | null;
  calendars: GoogleCalendarListEntry[];
  displayCalendarId: string;
  availabilityCalendarId: string;
  eventDestinationCalendarId: string;
  timezone: string;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  warning: string | null;
};
