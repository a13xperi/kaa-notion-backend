/**
 * Calendar Service
 * Handles appointment scheduling and calendar integrations.
 */

import { logger } from '../logger';

// ============================================================================
// TYPES
// ============================================================================

export interface CalendarConfig {
  provider: 'google' | 'outlook' | 'calendly' | 'internal';
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  webhookUrl?: string;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

export interface Appointment {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  attendees: AppointmentAttendee[];
  location?: string;
  meetingLink?: string;
  status: AppointmentStatus;
  type: AppointmentType;
  projectId?: string;
  clientId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppointmentAttendee {
  email: string;
  name?: string;
  role: 'organizer' | 'attendee' | 'optional';
  status: 'pending' | 'accepted' | 'declined' | 'tentative';
}

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'no-show';
export type AppointmentType = 'consultation' | 'review' | 'site-visit' | 'follow-up' | 'other';

export interface CreateAppointmentInput {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  timezone?: string;
  attendeeEmails: string[];
  location?: string;
  type: AppointmentType;
  projectId?: string;
  clientId?: string;
  sendInvites?: boolean;
}

export interface AvailabilityQuery {
  startDate: Date;
  endDate: Date;
  duration: number; // minutes
  timezone?: string;
}

export interface WorkingHours {
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

// ============================================================================
// IN-MEMORY STORE (Replace with database in production)
// ============================================================================

const appointments: Map<string, Appointment> = new Map();
let appointmentIdCounter = 1;

// Default working hours (9 AM - 5 PM, Mon-Fri)
const defaultWorkingHours: WorkingHours[] = [
  { dayOfWeek: 1, startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 }, // Monday
  { dayOfWeek: 2, startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 }, // Tuesday
  { dayOfWeek: 3, startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 }, // Wednesday
  { dayOfWeek: 4, startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 }, // Thursday
  { dayOfWeek: 5, startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 }, // Friday
];

// ============================================================================
// CONFIGURATION
// ============================================================================

let config: CalendarConfig = {
  provider: 'internal',
};

let workingHours: WorkingHours[] = defaultWorkingHours;

/**
 * Initialize the calendar service
 */
export function initCalendarService(overrides: Partial<CalendarConfig> = {}): void {
  config = { ...config, ...overrides };
  logger.info('Calendar service initialized', { provider: config.provider });
}

/**
 * Set working hours
 */
export function setWorkingHours(hours: WorkingHours[]): void {
  workingHours = hours;
}

/**
 * Get working hours
 */
export function getWorkingHours(): WorkingHours[] {
  return workingHours;
}

// ============================================================================
// AVAILABILITY
// ============================================================================

/**
 * Check if a time slot is within working hours
 */
function isWithinWorkingHours(date: Date): boolean {
  const dayOfWeek = date.getDay();
  const hours = workingHours.find((wh) => wh.dayOfWeek === dayOfWeek);
  
  if (!hours) return false;
  
  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  const startMinutes = hours.startHour * 60 + hours.startMinute;
  const endMinutes = hours.endHour * 60 + hours.endMinute;
  
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Check if a time slot conflicts with existing appointments
 */
function hasConflict(start: Date, end: Date): boolean {
  for (const appointment of appointments.values()) {
    if (appointment.status === 'cancelled') continue;
    
    const appointmentStart = new Date(appointment.startTime);
    const appointmentEnd = new Date(appointment.endTime);
    
    // Check for overlap
    if (start < appointmentEnd && end > appointmentStart) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get available time slots
 */
export function getAvailableSlots(query: AvailabilityQuery): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const { startDate, endDate, duration } = query;
  const durationMs = duration * 60 * 1000;
  
  // Iterate through each day
  const currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0);
  
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    const hours = workingHours.find((wh) => wh.dayOfWeek === dayOfWeek);
    
    if (hours) {
      // Create slots for this day
      const dayStart = new Date(currentDate);
      dayStart.setHours(hours.startHour, hours.startMinute, 0, 0);
      
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(hours.endHour, hours.endMinute, 0, 0);
      
      let slotStart = new Date(dayStart);
      
      while (slotStart.getTime() + durationMs <= dayEnd.getTime()) {
        const slotEnd = new Date(slotStart.getTime() + durationMs);
        
        // Check if slot is in the future and available
        const isAvailable = slotStart > new Date() && !hasConflict(slotStart, slotEnd);
        
        slots.push({
          start: new Date(slotStart),
          end: slotEnd,
          available: isAvailable,
        });
        
        // Move to next slot (30-minute intervals)
        slotStart = new Date(slotStart.getTime() + 30 * 60 * 1000);
      }
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return slots;
}

/**
 * Check if a specific time slot is available
 */
export function isSlotAvailable(start: Date, end: Date): boolean {
  // Must be in the future
  if (start <= new Date()) return false;
  
  // Must be within working hours
  if (!isWithinWorkingHours(start) || !isWithinWorkingHours(end)) return false;
  
  // Must not conflict with existing appointments
  return !hasConflict(start, end);
}

// ============================================================================
// APPOINTMENT MANAGEMENT
// ============================================================================

/**
 * Create a new appointment
 */
export async function createAppointment(input: CreateAppointmentInput): Promise<Appointment> {
  const { startTime, endTime, attendeeEmails } = input;
  
  // Validate availability
  if (!isSlotAvailable(startTime, endTime)) {
    throw new Error('Selected time slot is not available');
  }
  
  const id = `apt_${appointmentIdCounter++}_${Date.now()}`;
  
  const appointment: Appointment = {
    id,
    title: input.title,
    description: input.description,
    startTime,
    endTime,
    timezone: input.timezone || 'America/Los_Angeles',
    attendees: attendeeEmails.map((email, index) => ({
      email,
      role: index === 0 ? 'organizer' : 'attendee',
      status: 'pending',
    })),
    location: input.location,
    status: 'scheduled',
    type: input.type,
    projectId: input.projectId,
    clientId: input.clientId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  appointments.set(id, appointment);
  
  logger.info('Appointment created', {
    id,
    title: appointment.title,
    startTime: appointment.startTime,
    attendeeCount: appointment.attendees.length,
  });
  
  // In production, send calendar invites here
  if (input.sendInvites) {
    logger.info('Calendar invites would be sent', { appointmentId: id });
  }
  
  return appointment;
}

/**
 * Get an appointment by ID
 */
export function getAppointment(id: string): Appointment | undefined {
  return appointments.get(id);
}

/**
 * Update an appointment
 */
export async function updateAppointment(
  id: string,
  updates: Partial<Pick<Appointment, 'title' | 'description' | 'startTime' | 'endTime' | 'location' | 'status'>>
): Promise<Appointment | null> {
  const appointment = appointments.get(id);
  if (!appointment) return null;
  
  // If changing time, validate availability
  if (updates.startTime || updates.endTime) {
    const newStart = updates.startTime || appointment.startTime;
    const newEnd = updates.endTime || appointment.endTime;
    
    // Temporarily remove appointment to check availability
    appointments.delete(id);
    
    if (!isSlotAvailable(newStart, newEnd)) {
      appointments.set(id, appointment); // Restore
      throw new Error('New time slot is not available');
    }
  }
  
  const updated: Appointment = {
    ...appointment,
    ...updates,
    updatedAt: new Date(),
  };
  
  appointments.set(id, updated);
  
  logger.info('Appointment updated', { id, updates });
  
  return updated;
}

/**
 * Cancel an appointment
 */
export async function cancelAppointment(id: string, reason?: string): Promise<Appointment | null> {
  const appointment = appointments.get(id);
  if (!appointment) return null;
  
  const cancelled: Appointment = {
    ...appointment,
    status: 'cancelled',
    updatedAt: new Date(),
  };
  
  appointments.set(id, cancelled);
  
  logger.info('Appointment cancelled', { id, reason });
  
  return cancelled;
}

/**
 * List appointments with filters
 */
export function listAppointments(filters?: {
  clientId?: string;
  projectId?: string;
  status?: AppointmentStatus;
  type?: AppointmentType;
  startDate?: Date;
  endDate?: Date;
}): Appointment[] {
  let result = Array.from(appointments.values());
  
  if (filters) {
    if (filters.clientId) {
      result = result.filter((apt) => apt.clientId === filters.clientId);
    }
    if (filters.projectId) {
      result = result.filter((apt) => apt.projectId === filters.projectId);
    }
    if (filters.status) {
      result = result.filter((apt) => apt.status === filters.status);
    }
    if (filters.type) {
      result = result.filter((apt) => apt.type === filters.type);
    }
    if (filters.startDate) {
      result = result.filter((apt) => apt.startTime >= filters.startDate!);
    }
    if (filters.endDate) {
      result = result.filter((apt) => apt.startTime <= filters.endDate!);
    }
  }
  
  // Sort by start time
  return result.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}

/**
 * Get upcoming appointments for a client
 */
export function getUpcomingAppointments(clientId: string, limit = 5): Appointment[] {
  return listAppointments({
    clientId,
    status: 'scheduled',
    startDate: new Date(),
  }).slice(0, limit);
}

// ============================================================================
// CALENDAR INVITE GENERATION (ICS)
// ============================================================================

/**
 * Generate ICS calendar file content
 */
export function generateICS(appointment: Appointment): string {
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  const escapeText = (text: string): string => {
    return text.replace(/[,;\\]/g, (match) => '\\' + match).replace(/\n/g, '\\n');
  };
  
  const attendeeLines = appointment.attendees
    .map((a) => `ATTENDEE;ROLE=${a.role.toUpperCase()};PARTSTAT=${a.status.toUpperCase()}:mailto:${a.email}`)
    .join('\r\n');
  
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SAGE Design//Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${appointment.id}@sage.design`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(appointment.startTime)}`,
    `DTEND:${formatDate(appointment.endTime)}`,
    `SUMMARY:${escapeText(appointment.title)}`,
    appointment.description ? `DESCRIPTION:${escapeText(appointment.description)}` : '',
    appointment.location ? `LOCATION:${escapeText(appointment.location)}` : '',
    attendeeLines,
    `STATUS:${appointment.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  initCalendarService,
  setWorkingHours,
  getWorkingHours,
  getAvailableSlots,
  isSlotAvailable,
  createAppointment,
  getAppointment,
  updateAppointment,
  cancelAppointment,
  listAppointments,
  getUpcomingAppointments,
  generateICS,
};
