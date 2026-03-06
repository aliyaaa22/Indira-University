export type EventCategory = 'academic' | 'exam' | 'holiday' | 'event' | 'deadline';

export interface AcademicEvent {
  id: string;
  title: string;
  date: Date;
  endDate?: Date;
  category: EventCategory;
  description?: string;
  location?: string;
  applicableTo?: string;
  time?: string;
  facultyName?: string;
  facultyId?: string;
}

export const ACADEMIC_EVENTS: AcademicEvent[] = [
  {
    id: '1',
    title: 'Semester II Begins',
    date: new Date(2026, 2, 1),
    category: 'academic',
    description: 'Commencement of classes for the even semester.'
  },
  {
    id: '2',
    title: 'Holi Break',
    date: new Date(2026, 2, 5),
    endDate: new Date(2026, 2, 7),
    category: 'holiday',
    description: 'University closed for Holi celebrations.'
  },
  {
    id: '3',
    title: 'Mid-Semester Exams',
    date: new Date(2026, 2, 8),
    endDate: new Date(2026, 2, 14),
    category: 'exam',
    description: 'Internal assessment examinations.'
  },
  {
    id: '4',
    title: 'Guest Lecture: AI in Industry',
    date: new Date(2026, 2, 13),
    category: 'event',
    location: 'Main Auditorium',
    description: 'A talk by industry experts on the future of AI.'
  },
  {
    id: '5',
    title: 'Sports Day',
    date: new Date(2026, 2, 21),
    endDate: new Date(2026, 2, 23),
    category: 'event',
    location: 'University Ground'
  },
  {
    id: '6',
    title: 'Project Submission Deadline',
    date: new Date(2026, 2, 15),
    category: 'deadline',
    description: 'Final date for submitting mid-term projects.'
  },
  {
    id: '7',
    title: 'Fee Payment Deadline',
    date: new Date(2026, 2, 31),
    category: 'deadline',
    description: 'Last day to pay semester fees without late charges.'
  },
  {
    id: '8',
    title: 'Cultural Fest: Indira Utsav',
    date: new Date(2026, 3, 10),
    endDate: new Date(2026, 3, 12),
    category: 'event',
    description: 'Annual cultural festival.'
  }
];
