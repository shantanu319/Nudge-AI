// calendar.js - Google Calendar Integration Module
console.log('📅 Calendar integration module loading...');

const CALENDAR_CACHE = {
  events: [],
  lastFetched: null
};

// How long to consider the cache valid (15 minutes)
const CALENDAR_CACHE_DURATION = 15 * 60 * 1000;

// How far in the future to fetch events
const FUTURE_EVENTS_HOURS = 8;

/**
 * Get an OAuth token for the Google Calendar API
 * @param {boolean} interactive - Whether to show an interactive login prompt
 * @returns {Promise<string>} The auth token
 */
function getAuthToken(interactive = false) {
  return new Promise((resolve, reject) => {
    try {
      // Check if identity API is available
      if (!chrome || !chrome.identity) {
        console.error('Chrome identity API not available');
        return reject(new Error('Chrome identity API not available'));
      }

      console.log(`Requesting auth token (interactive: ${interactive})`);
      chrome.identity.getAuthToken({ interactive: interactive }, (token) => {
        if (chrome.runtime.lastError) {
          console.error('OAuth Error:', chrome.runtime.lastError.message || 'Unknown error');
          
          // If not interactive, try again with interactive true
          if (!interactive) {
            console.log('Retrying with interactive login...');
            setTimeout(() => {
              getAuthToken(true)
                .then(resolve)
                .catch(reject);
            }, 500);
            return;
          }
          
          reject(new Error(chrome.runtime.lastError.message || 'Authentication failed'));
        } else if (!token) {
          console.error('No token returned');
          reject(new Error('No token returned from authentication'));
        } else {
          console.log('✅ Obtained Calendar auth token successfully');
          resolve(token);
        }
      });
    } catch (error) {
      console.error('Fatal error in getAuthToken:', error);
      reject(error);
    }
  });
}

/**
 * Fetch calendar events from Google Calendar API
 * @param {boolean} forceRefresh - Whether to force a refresh regardless of cache
 * @returns {Promise<Array>} Array of calendar events
 */
async function fetchCalendarEvents(forceRefresh = false) {
  try {
    // Check if cache is still valid
    const now = new Date();
    if (
      !forceRefresh &&
      CALENDAR_CACHE.lastFetched &&
      (now.getTime() - CALENDAR_CACHE.lastFetched.getTime() < CALENDAR_CACHE_DURATION)
    ) {
      console.log('📅 Using cached calendar events');
      return CALENDAR_CACHE.events;
    }

    // First try getting a non-interactive token
    let token;
    try {
      token = await getAuthToken(false);
    } catch (authError) {
      console.log('Non-interactive auth failed, will try interactive:', authError.message);
      // Let the user know they need to authenticate
      if (confirm('To access your Google Calendar, you need to authorize this extension. Would you like to do that now?')) {
        token = await getAuthToken(true);
      } else {
        throw new Error('Calendar access not granted by user');
      }
    }
    
    if (!token) {
      throw new Error('Failed to obtain authentication token');
    }
    
    // Calculate time range
    const timeMin = new Date().toISOString();
    const timeMax = new Date(now.getTime() + FUTURE_EVENTS_HOURS * 60 * 60 * 1000).toISOString();
    
    // Fetch events from the API
    console.log(`📅 Fetching calendar events from now until ${FUTURE_EVENTS_HOURS} hours from now`);
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Calendar API error details:', errorData);
      
      if (response.status === 401) {
        // Token expired or invalid, clear it and retry with interactive login
        console.log('🔄 Token expired, requesting new one with interactive login');
        await new Promise((resolve) => {
          chrome.identity.removeCachedAuthToken({ token }, resolve);
        });
        return fetchCalendarEvents(true);
      }
      
      throw new Error(`Calendar API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`📅 Fetched ${data.items?.length || 0} calendar events`);
    
    // Update cache
    CALENDAR_CACHE.events = data.items || [];
    CALENDAR_CACHE.lastFetched = now;
    
    return CALENDAR_CACHE.events;
  } catch (error) {
    console.error('❌ Error fetching calendar events:', error.message);
    // Return empty array instead of throwing to avoid breaking the entire extension
    return [];
  }
}

/**
 * Determine if the user is currently in a meeting or focus time
 * based on their calendar events
 * @returns {Promise<{isBusy: boolean, currentEvent: Object|null, nextEvent: Object|null}>} Status object
 */
async function getUserCalendarStatus() {
  try {
    const events = await fetchCalendarEvents();
    
    // If no events were fetched (possibly due to auth issues), return empty state
    if (!events || events.length === 0) {
      return { isBusy: false, currentEvent: null, nextEvent: null, totalEvents: 0 };
    }
    
    const now = new Date();
    
    // Find current event (if any)
    let currentEvent = null;
    let nextEvent = null;
    
    for (const event of events) {
      // Skip declined events
      if (event.attendees && event.attendees.some(a => 
          a.self && a.responseStatus === 'declined')) {
        continue;
      }
      
      // Handle both date-only and datetime events properly
      let start, end;
      
      if (event.start.dateTime) {
        // This is a timed event
        start = new Date(event.start.dateTime);
        end = new Date(event.end.dateTime);
      } else if (event.start.date) {
        // This is an all-day event
        start = new Date(event.start.date + 'T00:00:00');
        end = new Date(event.end.date + 'T23:59:59');  // End date is exclusive in GCal API
      } else {
        console.warn('Event with invalid date format:', event);
        continue;
      }
      
      // Check if this event is happening now
      if (start <= now && now < end) {
        currentEvent = event;
        break;
      }
      
      // Check if this is the next upcoming event
      if (start > now && (!nextEvent || start < new Date(nextEvent.start.dateTime || nextEvent.start.date + 'T00:00:00'))) {
        nextEvent = event;
      }
    }
    
    // Determine if the user is busy
    // They are considered busy if:
    // 1. They are in a current meeting, OR
    // 2. They have a focus time event (contains "focus" in the title)
    const isBusy = !!(
      currentEvent && (
        currentEvent.summary?.toLowerCase().includes('focus') ||
        !currentEvent.summary?.toLowerCase().includes('free') // Assume all meetings make you busy unless marked as "free"
      )
    );
    
    return {
      isBusy,
      currentEvent,
      nextEvent,
      totalEvents: events.length
    };
  } catch (error) {
    console.error('❌ Error checking calendar status:', error.message);
    // Default to not busy if we can't check
    return { isBusy: false, currentEvent: null, nextEvent: null, totalEvents: 0 };
  }
}

/**
 * Get a text description of the user's calendar status
 * for inclusion in AI prompts
 * @returns {Promise<string>} Text description of calendar status
 */
async function getCalendarContextForAI() {
  try {
    const { isBusy, currentEvent, nextEvent, totalEvents } = await getUserCalendarStatus();
    
    if (totalEvents === 0) {
      return "The user has no upcoming calendar events.";
    }
    
    let contextText = "";
    
    // Add info about current event
    if (currentEvent) {
      const eventType = currentEvent.summary?.toLowerCase().includes('focus') 
        ? 'focus time' 
        : 'meeting';
      
      contextText += `The user is currently in a ${eventType}: "${currentEvent.summary}". `;
      
      // Add event description if available
      if (currentEvent.description) {
        contextText += `The description is: "${currentEvent.description}". `;
      }
    } else {
      contextText += "The user is not currently in any scheduled event. ";
    }
    
    // Add info about next event
    if (nextEvent) {
      const startTime = new Date(nextEvent.start.dateTime || nextEvent.start.date);
      const minutesUntilNext = Math.round((startTime - new Date()) / 60000);
      
      contextText += `Their next event "${nextEvent.summary}" starts in ${minutesUntilNext} minutes. `;
    }
    
    return contextText;
  } catch (error) {
    console.error('❌ Error generating calendar context for AI:', error);
    return ""; // Return empty string on error
  }
}

// Set up periodic calendar refreshing (every 15 minutes)
function startPeriodicCalendarRefresh() {
  // Don't fetch immediately, wait a bit to let the extension initialize
  setTimeout(() => {
    console.log('🔄 Initial calendar fetch starting');
    fetchCalendarEvents()
      .then(events => {
        console.log(`📅 Initial calendar fetch completed, found ${events.length} events`);
      })
      .catch(err => {
        console.error('Initial calendar fetch failed:', err.message);
        // Show a notification to the user
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon.jpg',
          title: 'Calendar Integration',
          message: 'Please click the extension icon to set up Google Calendar integration',
          priority: 2
        });
      });
  }, 5000); // Wait 5 seconds before first fetch
  
  // Then set up interval
  const FIFTEEN_MINUTES = 15 * 60 * 1000;
  setInterval(() => {
    console.log('🔄 Performing scheduled calendar refresh');
    fetchCalendarEvents().catch(err => console.error('Scheduled calendar fetch failed:', err.message));
  }, FIFTEEN_MINUTES);
}

// Expose functions that will be used by other modules
export {
  fetchCalendarEvents,
  getUserCalendarStatus,
  getCalendarContextForAI,
  startPeriodicCalendarRefresh
};
