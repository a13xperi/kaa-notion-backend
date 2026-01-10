/**
 * Calendar Service Tests
 */

import {
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
  generateICS,
} from '../calendarService';

let testDayOffset = 0;

// Helper to get next valid weekday (Mon-Fri) at a specific hour
// Uses offset to ensure each test gets a different day
function getNextWeekday(hour: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + 14 + testDayOffset); // Start from 2 weeks out
  testDayOffset++;
  
  // Find next Monday through Friday
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }
  
  date.setHours(hour, 0, 0, 0);
  return date;
}

describe('CalendarService', () => {
  beforeEach(() => {
    testDayOffset = 0; // Reset offset for each test
    initCalendarService({ provider: 'internal' });
    
    // Reset working hours to default
    setWorkingHours([
      { dayOfWeek: 1, startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
      { dayOfWeek: 2, startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
      { dayOfWeek: 3, startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
      { dayOfWeek: 4, startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
      { dayOfWeek: 5, startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
    ]);
  });

  describe('getWorkingHours', () => {
    it('returns default working hours', () => {
      const hours = getWorkingHours();
      
      expect(hours.length).toBe(5);
      expect(hours[0].dayOfWeek).toBe(1); // Monday
      expect(hours[0].startHour).toBe(9);
      expect(hours[0].endHour).toBe(17);
    });

    it('allows setting custom working hours', () => {
      setWorkingHours([
        { dayOfWeek: 1, startHour: 10, startMinute: 0, endHour: 18, endMinute: 0 },
      ]);

      const hours = getWorkingHours();
      expect(hours.length).toBe(1);
      expect(hours[0].startHour).toBe(10);
    });
  });

  describe('getAvailableSlots', () => {
    it('returns slots for the specified date range', () => {
      // Get a future weekday
      const startDate = getNextWeekday(9);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 5); // Get a full week to ensure weekday coverage

      const slots = getAvailableSlots({
        startDate,
        endDate,
        duration: 60,
      });

      expect(slots.length).toBeGreaterThan(0);
    });

    it('marks past slots as unavailable', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);
      pastDate.setHours(0, 0, 0, 0);

      const endDate = new Date(pastDate);
      endDate.setDate(endDate.getDate() + 1);

      const slots = getAvailableSlots({
        startDate: pastDate,
        endDate,
        duration: 60,
      });

      // All past slots should be marked unavailable
      const availableSlots = slots.filter((s) => s.available);
      expect(availableSlots.length).toBe(0);
    });
  });

  describe('isSlotAvailable', () => {
    it('returns false for past times', () => {
      const pastStart = new Date();
      pastStart.setHours(pastStart.getHours() - 1);
      const pastEnd = new Date(pastStart.getTime() + 60 * 60 * 1000);

      expect(isSlotAvailable(pastStart, pastEnd)).toBe(false);
    });

    it('returns false for weekends with default hours', () => {
      const saturday = new Date();
      saturday.setDate(saturday.getDate() + (6 - saturday.getDay() + 7) % 7 + 7);
      saturday.setHours(10, 0, 0, 0);
      const saturdayEnd = new Date(saturday.getTime() + 60 * 60 * 1000);

      expect(isSlotAvailable(saturday, saturdayEnd)).toBe(false);
    });
  });

  describe('createAppointment', () => {
    it('creates an appointment', async () => {
      const futureDate = getNextWeekday(10);
      const endTime = new Date(futureDate.getTime() + 60 * 60 * 1000);

      const appointment = await createAppointment({
        title: 'Consultation',
        description: 'Initial project consultation',
        startTime: futureDate,
        endTime,
        attendeeEmails: ['client@example.com', 'team@sage.design'],
        type: 'consultation',
      });

      expect(appointment.id).toBeDefined();
      expect(appointment.title).toBe('Consultation');
      expect(appointment.attendees.length).toBe(2);
      expect(appointment.status).toBe('scheduled');
    });

    it('throws error for unavailable slot', async () => {
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1);

      await expect(createAppointment({
        title: 'Test',
        startTime: pastDate,
        endTime: new Date(pastDate.getTime() + 60 * 60 * 1000),
        attendeeEmails: ['test@example.com'],
        type: 'consultation',
      })).rejects.toThrow('Selected time slot is not available');
    });
  });

  describe('getAppointment', () => {
    it('returns appointment by ID', async () => {
      const futureDate = getNextWeekday(11);

      const created = await createAppointment({
        title: 'Test Appointment',
        startTime: futureDate,
        endTime: new Date(futureDate.getTime() + 60 * 60 * 1000),
        attendeeEmails: ['test@example.com'],
        type: 'consultation',
      });

      const found = getAppointment(created.id);
      expect(found?.title).toBe('Test Appointment');
    });

    it('returns undefined for non-existent ID', () => {
      expect(getAppointment('non-existent')).toBeUndefined();
    });
  });

  describe('updateAppointment', () => {
    it('updates appointment properties', async () => {
      const futureDate = getNextWeekday(12);

      const appointment = await createAppointment({
        title: 'Original Title',
        startTime: futureDate,
        endTime: new Date(futureDate.getTime() + 60 * 60 * 1000),
        attendeeEmails: ['test@example.com'],
        type: 'consultation',
      });

      const updated = await updateAppointment(appointment.id, {
        title: 'Updated Title',
        location: 'Online',
      });

      expect(updated?.title).toBe('Updated Title');
      expect(updated?.location).toBe('Online');
    });

    it('returns null for non-existent appointment', async () => {
      const result = await updateAppointment('non-existent', { title: 'Test' });
      expect(result).toBeNull();
    });
  });

  describe('cancelAppointment', () => {
    it('cancels an appointment', async () => {
      const futureDate = getNextWeekday(13);

      const appointment = await createAppointment({
        title: 'To Cancel',
        startTime: futureDate,
        endTime: new Date(futureDate.getTime() + 60 * 60 * 1000),
        attendeeEmails: ['test@example.com'],
        type: 'consultation',
      });

      const cancelled = await cancelAppointment(appointment.id, 'Client request');
      expect(cancelled?.status).toBe('cancelled');
    });
  });

  describe('listAppointments', () => {
    it('filters by client ID', async () => {
      const futureDate = getNextWeekday(14);

      await createAppointment({
        title: 'Client A',
        startTime: futureDate,
        endTime: new Date(futureDate.getTime() + 60 * 60 * 1000),
        attendeeEmails: ['test@example.com'],
        type: 'consultation',
        clientId: 'client-a',
      });

      const futureDate2 = getNextWeekday(15);
      await createAppointment({
        title: 'Client B',
        startTime: futureDate2,
        endTime: new Date(futureDate2.getTime() + 60 * 60 * 1000),
        attendeeEmails: ['test@example.com'],
        type: 'consultation',
        clientId: 'client-b',
      });

      const clientAAppointments = listAppointments({ clientId: 'client-a' });
      expect(clientAAppointments.length).toBe(1);
      expect(clientAAppointments[0].title).toBe('Client A');
    });
  });

  describe('generateICS', () => {
    it('generates valid ICS content', async () => {
      // Use 9 AM to ensure within working hours
      const futureDate = getNextWeekday(9);

      const appointment = await createAppointment({
        title: 'ICS Test',
        description: 'Testing ICS generation',
        startTime: futureDate,
        endTime: new Date(futureDate.getTime() + 60 * 60 * 1000),
        attendeeEmails: ['test@example.com'],
        location: 'Test Location',
        type: 'consultation',
      });

      const ics = generateICS(appointment);

      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('END:VCALENDAR');
      expect(ics).toContain('BEGIN:VEVENT');
      expect(ics).toContain('END:VEVENT');
      expect(ics).toContain('SUMMARY:ICS Test');
      expect(ics).toContain('LOCATION:Test Location');
    });
  });
});
