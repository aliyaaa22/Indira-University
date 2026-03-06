/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  isWithinInterval,
  parseISO,
  differenceInDays
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Download, 
  Settings, 
  Bell, 
  Search,
  BookOpen,
  GraduationCap,
  Palmtree,
  PartyPopper,
  Clock,
  ExternalLink,
  FileText,
  ShieldCheck,
  ChevronDown,
  PlusSquare,
  Layout,
  User,
  AlertCircle,
  LogOut,
  Plus,
  X,
  Trash2,
  Edit2,
  Filter,
  Save,
  Check
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from './lib/utils';
import { ACADEMIC_EVENTS, AcademicEvent, EventCategory } from './data/events';

const CATEGORY_COLORS: Record<EventCategory, { bg: string; text: string; border: string; dot: string }> = {
  academic: { bg: 'bg-blue-500', text: 'text-white', border: 'border-blue-600', dot: 'bg-blue-500' },
  exam: { bg: 'bg-rose-500', text: 'text-white', border: 'border-rose-600', dot: 'bg-rose-500' },
  holiday: { bg: 'bg-emerald-600', text: 'text-white', border: 'border-emerald-700', dot: 'bg-emerald-600' },
  event: { bg: 'bg-indigo-600', text: 'text-white', border: 'border-indigo-700', dot: 'bg-indigo-600' },
  deadline: { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-600', dot: 'bg-orange-500' },
};

const CATEGORY_LABELS: Record<EventCategory, string> = {
  academic: 'Academic',
  exam: 'Exams',
  holiday: 'Holiday',
  event: 'Events',
  deadline: 'Deadlines',
};

type Role = 'student' | 'faculty' | 'admin' | 'hod';

interface Notification {
  id: string;
  title: string;
  message: string;
  date: Date;
  isRead: boolean;
}

interface ChangeRequest {
  id: string;
  type: 'add' | 'update' | 'delete';
  event: AcademicEvent;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: Date;
  adminId: string;
}

function LoginPage({ onLogin }: { onLogin: (role: Role) => void }) {
  const [role, setRole] = useState<Role>('student');

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md border border-slate-200"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-[#2B579A] rounded-full flex items-center justify-center text-white mb-4">
            <GraduationCap className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Academic Portal</h1>
          <p className="text-slate-500 text-sm text-center">Select your role to access the Academic Calendar</p>
        </div>

        <div className="space-y-3 mb-8">
          {(['student', 'faculty', 'admin', 'hod'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={cn(
                "w-full p-4 rounded-lg border-2 flex items-center justify-between transition-all active:scale-[0.98]",
                role === r 
                  ? "border-[#2B579A] bg-blue-50 text-[#2B579A]" 
                  : "border-slate-100 hover:border-slate-200 text-slate-600"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  role === r ? "bg-white" : "bg-slate-50"
                )}>
                  {r === 'student' && <User className="w-5 h-5" />}
                  {r === 'faculty' && <BookOpen className="w-5 h-5" />}
                  {r === 'admin' && <ShieldCheck className="w-5 h-5" />}
                  {r === 'hod' && <ShieldCheck className="w-5 h-5 text-indigo-600" />}
                </div>
                <span className="font-bold capitalize">{r === 'admin' ? 'Admin Chair' : r === 'hod' ? 'HOD' : r}</span>
              </div>
              {role === r && (
                <motion.div 
                  layoutId="active-role"
                  className="w-2 h-2 rounded-full bg-[#2B579A]" 
                />
              )}
            </button>
          ))}
        </div>

        <button 
          onClick={() => onLogin(role)}
          className="w-full bg-[#2B579A] text-white py-3.5 rounded-lg font-bold hover:bg-[#1e3e6d] transition-all shadow-lg shadow-blue-900/20 active:scale-95"
        >
          Sign In
        </button>
      </motion.div>
    </div>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 4)); // March 2026
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | 'all'>('all');
  const [view, setView] = useState<'month' | 'list' | 'week'>('month');
  const [hoveredDay, setHoveredDay] = useState<Date | null>(null);
  
  // Admin Specific State
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isCalendarLoaded, setIsCalendarLoaded] = useState(false);
  const [events, setEvents] = useState<AcademicEvent[]>(ACADEMIC_EVENTS);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHODRequests, setShowHODRequests] = useState(false);
  const [selectedInstitute, setSelectedInstitute] = useState('');
  const [isFinalised, setIsFinalised] = useState(false);
  const [showDashboard, setShowDashboard] = useState(true);
  const [yearlyListType, setYearlyListType] = useState<'exam' | 'holiday' | null>(null);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [editingEvent, setEditingEvent] = useState<AcademicEvent | null>(null);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [isSingleDay, setIsSingleDay] = useState(true);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkEvents, setBulkEvents] = useState<any[]>([
    { id: '1', title: '', category: 'academic', date: '', endDate: '', isSingleDay: true, description: '', time: '', facultyName: '', facultyId: '', location: '' }
  ]);
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);
  const [isBulkManageOpen, setIsBulkManageOpen] = useState(false);
  const [isCalendarViewOnly, setIsCalendarViewOnly] = useState(false);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [bulkUpdateData, setBulkUpdateData] = useState<{ category?: EventCategory; title?: string; date?: string }>({});
  const [newEvent, setNewEvent] = useState<Partial<AcademicEvent>>({
    title: '',
    category: 'academic',
    date: new Date(2026, 2, 4),
    description: '',
    location: '',
    applicableTo: 'All Students',
  });

  const today = new Date(2026, 2, 4); // Current local time from metadata

  const toggleDateSelection = (day: Date) => {
    setSelectedDates(prev => {
      const isSelected = prev.some(d => isSameDay(d, day));
      if (isSelected) {
        return prev.filter(d => !isSameDay(d, day));
      } else {
        return [...prev, day];
      }
    });
  };

  const handleDeleteSelected = () => {
    if (selectedDates.length === 0) {
      window.alert("Please select at least one date.");
      return;
    }
    setEvents(prev => prev.filter(event => 
      !selectedDates.some(d => 
        isSameDay(d, event.date) || 
        (event.endDate && isWithinInterval(d, { start: event.date, end: event.endDate }))
      )
    ));
    setSelectedDates([]);
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
  };

  const handleBulkUpdateSave = () => {
    if (selectedDates.length === 0) return;
    
    const affectedEvents = events.filter(event => 
      selectedDates.some(d => 
        isSameDay(d, event.date) || 
        (event.endDate && isWithinInterval(d, { start: event.date, end: event.endDate }))
      )
    );

    if (affectedEvents.length === 0) {
      setIsBulkUpdateOpen(false);
      setSelectedDates([]);
      setBulkUpdateData({});
      return;
    }

    if (isFinalised) {
      affectedEvents.forEach(event => {
        const updatedEvent = {
          ...event,
          ...(bulkUpdateData.category ? { category: bulkUpdateData.category } : {}),
          ...(bulkUpdateData.title ? { title: bulkUpdateData.title } : {}),
          ...(bulkUpdateData.date ? { date: new Date(bulkUpdateData.date + 'T00:00:00') } : {})
        };
        createChangeRequest('update', updatedEvent);
      });
      setIsBulkUpdateOpen(false);
      setSelectedDates([]);
      setBulkUpdateData({});
      return;
    }

    setEvents(prev => prev.map(event => {
      const isAffected = affectedEvents.some(ae => ae.id === event.id);
      
      if (isAffected) {
        return {
          ...event,
          ...(bulkUpdateData.category ? { category: bulkUpdateData.category } : {}),
          ...(bulkUpdateData.title ? { title: bulkUpdateData.title } : {}),
          ...(bulkUpdateData.date ? { date: new Date(bulkUpdateData.date + 'T00:00:00') } : {})
        };
      }
      return event;
    }));
    
    addNotification("Bulk Update Applied", `${affectedEvents.length} events have been updated.`);
    setIsBulkUpdateOpen(false);
    setSelectedDates([]);
    setBulkUpdateData({});
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
  };

  const handleFeatureNotImplemented = (featureName: string) => {
    window.alert(`${featureName} feature is currently under development and will be available in the next update.`);
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = useMemo(() => {
    if (view === 'week') {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    }
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [startDate, endDate, view, currentDate]);

  const filteredEvents = useMemo(() => {
    let filtered = events.filter(event => 
      selectedCategory === 'all' || event.category === selectedCategory
    );
    
    if (userRole === 'faculty' && showMyEventsOnly) {
      filtered = filtered.filter(event => event.facultyId === 'FAC001' || event.facultyName === 'Dr. Rajesh Kumar');
    }
    
    return filtered;
  }, [selectedCategory, events, userRole, showMyEventsOnly]);

  const getEventsForDay = (day: Date) => {
    return filteredEvents.filter(event => {
      if (event.endDate) {
        return isWithinInterval(day, { start: event.date, end: event.endDate });
      }
      return isSameDay(day, event.date);
    });
  };

  const next = () => {
    if (view === 'week') setCurrentDate(addDays(currentDate, 7));
    else setCurrentDate(addMonths(currentDate, 1));
  };
  
  const prev = () => {
    if (view === 'week') setCurrentDate(addDays(currentDate, -7));
    else setCurrentDate(subMonths(currentDate, 1));
  };

  const upcomingEvents = useMemo(() => {
    return events
      .filter(e => e.date >= today)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 4);
  }, [events, today]);

  const nextExam = useMemo(() => {
    return events.find(e => e.category === 'exam' && e.date >= today);
  }, [events, today]);

  const handleExportFullCalendar = () => {
    const headers = ['Event Name', 'Event Type', 'Start Date', 'End Date', 'Description', 'Time', 'Location', 'Faculty Name', 'Faculty ID'];
    const rows = events.sort((a, b) => a.date.getTime() - b.date.getTime()).map(ev => [
      ev.title,
      CATEGORY_LABELS[ev.category],
      format(ev.date, 'dd MMM yyyy'),
      ev.endDate ? format(ev.endDate, 'dd MMM yyyy') : '-',
      ev.description || '-',
      ev.time || '-',
      ev.location || '-',
      ev.facultyName || '-',
      ev.facultyId || '-'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Full_Academic_Calendar_2025-26.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLogin = (role: Role) => {
    setUserRole(role);
    setIsLoggedIn(true);
    setShowDashboard(role !== 'admin');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserRole(null);
    setIsProfileOpen(false);
    setIsAddEventOpen(false);
    setIsCalendarLoaded(false);
  };

  useEffect(() => {
    if (selectedInstitute && selectedCourse && selectedYear && selectedSemester) {
      setIsCalendarLoaded(true);
    }
  }, [selectedInstitute, selectedCourse, selectedYear, selectedSemester]);

  const handleLoadCalendar = () => {
    if (!selectedInstitute || !selectedCourse || !selectedYear || !selectedSemester) {
      alert("Please fill all mandatory fields (Institute, Course, Year, Semester) to load the calendar.");
      return;
    }
    setIsCalendarLoaded(true);
  };

  const handleAddEvent = (day?: Date) => {
    if (!isCalendarLoaded) {
      alert("Please load a calendar first by selecting the Institute, Course, Year, and Semester.");
      return;
    }
    setNewEvent({
      title: '',
      date: day || today,
      category: 'academic',
      description: '',
      location: '',
      applicableTo: 'All Students',
    });
    setEditingEvent(null);
    setIsAddEventOpen(true);
  };

  const [showMyEventsOnly, setShowMyEventsOnly] = useState(false);

  const addNotification = (title: string, message: string) => {
    setNotifications(prev => [
      {
        id: Math.random().toString(36).substr(2, 9),
        title,
        message,
        date: new Date(),
        isRead: false
      },
      ...prev
    ]);
  };

  const createChangeRequest = (type: 'add' | 'update' | 'delete', event: AcademicEvent) => {
    const request: ChangeRequest = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      event,
      status: 'pending',
      requestDate: new Date(),
      adminId: 'admin-1'
    };
    setChangeRequests(prev => [request, ...prev]);
    window.alert(`Request to ${type} event "${event.title}" has been sent to HOD for approval.`);
  };

  const handleApproveRequest = (request: ChangeRequest) => {
    if (request.type === 'add') {
      setEvents(prev => [...prev, request.event]);
      addNotification("New Event Added", `A new event "${request.event.title}" has been added to the calendar.`);
    } else if (request.type === 'update') {
      setEvents(prev => prev.map(e => e.id === request.event.id ? request.event : e));
      addNotification("Event Updated", `The event "${request.event.title}" has been updated.`);
    } else if (request.type === 'delete') {
      setEvents(prev => prev.filter(e => e.id !== request.event.id));
      addNotification("Event Removed", `The event "${request.event.title}" has been removed from the calendar.`);
    }
    
    setChangeRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: 'approved' } : r));
  };

  const handleRejectRequest = (request: ChangeRequest) => {
    setChangeRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: 'rejected' } : r));
    window.alert(`Request to ${request.type} event "${request.event.title}" has been rejected.`);
  };

  const handleEditEvent = (event: AcademicEvent) => {
    if (window.confirm("Do you want to edit this event?")) {
      setEditingEvent(event);
      setNewEvent({ ...event });
      setIsAddEventOpen(true);
    }
  };

  const handleDeleteEvent = (id: string) => {
    const eventToDelete = events.find(e => e.id === id);
    if (!eventToDelete) return;

    if (isFinalised) {
      createChangeRequest('delete', eventToDelete);
      return;
    }

    if (window.confirm("Are you sure you want to remove this event?")) {
      setEvents(prev => prev.filter(e => e.id !== id));
      addNotification("Event Removed", `The event "${eventToDelete.title}" has been removed.`);
      window.alert("Event removed successfully!");
    }
  };

  const handleSaveEvent = () => {
    if (!newEvent.title || !newEvent.title.trim()) {
      window.alert("Please provide an event title.");
      return;
    }
    
    // Validate Date
    if (!newEvent.date || isNaN(newEvent.date.getTime())) {
      window.alert("Please provide a valid event date.");
      return;
    }

    // Past Date Restriction
    if (!editingEvent && newEvent.date < today && !isSameDay(newEvent.date, today)) {
      window.alert("You cannot select past dates for new events.");
      return;
    }

    // Single Day Logic
    const finalEndDate = isSingleDay ? undefined : newEvent.endDate;

    // Validate End Date if present
    if (finalEndDate && isNaN(finalEndDate.getTime())) {
      window.alert("The end date provided is invalid.");
      return;
    }

    if (finalEndDate && finalEndDate < newEvent.date) {
      window.alert("End date cannot be before the start date.");
      return;
    }

    try {
      const id = editingEvent ? editingEvent.id : Math.random().toString(36).substr(2, 9);
      const eventToSave: AcademicEvent = { 
        id,
        title: newEvent.title.trim(),
        date: newEvent.date!,
        category: newEvent.category || 'academic',
        description: newEvent.description || '',
        location: newEvent.location || '',
        applicableTo: newEvent.applicableTo || 'All Students',
        endDate: finalEndDate,
        time: newEvent.time,
        facultyName: newEvent.facultyName,
        facultyId: newEvent.facultyId
      };

      if (isFinalised) {
        createChangeRequest(editingEvent ? 'update' : 'add', eventToSave);
        setIsAddEventOpen(false);
        setEditingEvent(null);
        setIsSingleDay(true);
        return;
      }

      if (editingEvent) {
        setEvents(prev => prev.map(e => e.id === editingEvent.id ? eventToSave : e));
        addNotification("Event Updated", `The event "${eventToSave.title}" has been updated.`);
      } else {
        setEvents(prev => [...prev, eventToSave]);
        addNotification("New Event Added", `A new event "${eventToSave.title}" has been added on ${format(eventToSave.date, 'dd MMM')}.`);
        
        // Navigate to the date of the new event so the user can see it
        setCurrentDate(newEvent.date!);
        
        // Ensure the category filter doesn't hide the new event
        if (selectedCategory !== 'all' && selectedCategory !== eventToSave.category) {
          setSelectedCategory('all');
        }
      }
      
      setIsAddEventOpen(false);
      setEditingEvent(null);
      setIsSingleDay(true);
      
      // Show success toast
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3000);

      // Reset newEvent state
      setNewEvent({
        title: '',
        category: 'academic',
        date: today,
        description: '',
        location: '',
        applicableTo: 'All Students',
      });
    } catch (error) {
      console.error("Error saving event:", error);
      window.alert("An error occurred while saving the event.");
    }
  };

  const handleBulkSave = () => {
    const validEvents: AcademicEvent[] = [];
    
    for (const be of bulkEvents) {
      if (!be.title || !be.title.trim()) continue;
      
      const startDate = be.date ? new Date(be.date + 'T00:00:00') : null;
      if (!startDate || isNaN(startDate.getTime())) continue;
      
      // Past Date Restriction
      if (startDate < today && !isSameDay(startDate, today)) {
        window.alert(`Event "${be.title}" has a past date. You cannot select past dates.`);
        return;
      }

      const endDate = be.isSingleDay ? undefined : (be.endDate ? new Date(be.endDate + 'T00:00:00') : undefined);
      if (!be.isSingleDay && endDate && endDate < startDate) {
        window.alert(`Event "${be.title}" has an end date before the start date.`);
        return;
      }

      validEvents.push({
        id: Math.random().toString(36).substr(2, 9),
        title: be.title.trim(),
        category: be.category as EventCategory,
        date: startDate,
        endDate: endDate,
        description: be.description || '',
        applicableTo: 'All Students',
        time: be.time,
        facultyName: be.facultyName,
        facultyId: be.facultyId,
        location: be.location,
      });
    }

    if (validEvents.length === 0) {
      window.alert("Please fill in at least one valid event.");
      return;
    }

    setEvents(prev => [...prev, ...validEvents]);
    setIsBulkMode(false);
    setBulkEvents([{ id: '1', title: '', category: 'academic', date: '', endDate: '', isSingleDay: true, description: '' }]);
    setSelectedCategory('all');
    
    // Show success toast
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
  };

  const handleBulkDeleteEvents = () => {
    if (selectedEventIds.length === 0) {
      window.alert("Please select at least one event.");
      return;
    }
    setEvents(prev => prev.filter(e => !selectedEventIds.includes(e.id)));
    setSelectedEventIds([]);
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
  };

  const handleBulkUpdateEventsSave = () => {
    if (selectedEventIds.length === 0) return;
    
    setEvents(prev => prev.map(event => {
      if (selectedEventIds.includes(event.id)) {
        return {
          ...event,
          ...(bulkUpdateData.category ? { category: bulkUpdateData.category } : {}),
          ...(bulkUpdateData.title ? { title: bulkUpdateData.title } : {})
        };
      }
      return event;
    }));
    
    setIsBulkUpdateOpen(false);
    setSelectedEventIds([]);
    setBulkUpdateData({});
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
  };

  const addBulkRow = () => {
    setBulkEvents(prev => [
      ...prev,
      { id: Math.random().toString(36).substr(2, 9), title: '', category: 'academic', date: '', endDate: '', isSingleDay: true, description: '' }
    ]);
  };

  const removeBulkRow = (id: string) => {
    if (bulkEvents.length > 1) {
      setBulkEvents(prev => prev.filter(be => be.id !== id));
    }
  };

  const updateBulkRow = (id: string, field: string, value: any) => {
    setBulkEvents(prev => prev.map(be => be.id === id ? { ...be, [field]: value } : be));
  };

  const handleGlobalSave = () => {
    if (!isCalendarLoaded) {
      window.alert("No calendar is loaded. Please load a calendar before saving changes.");
      return;
    }
    setIsFinalizeModalOpen(true);
  };

  const confirmFinalize = () => {
    setIsFinalised(true);
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
    setIsFinalizeModalOpen(false);
    setShowDashboard(true);
  };

  const Dashboard = () => {
    const upcoming = upcomingEvents;
    const exam = nextExam;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Links */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Layout className="w-5 h-5 text-[#2B579A]" />
                Quick Links
              </h3>
            </div>
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => setYearlyListType('exam')}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-[#2B579A] hover:text-[#2B579A] transition-all shadow-sm active:scale-95"
              >
                <PlusSquare className="w-4 h-4" />
                Exam Schedule
              </button>
              <button 
                onClick={() => setYearlyListType('holiday')}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-[#2B579A] hover:text-[#2B579A] transition-all shadow-sm active:scale-95"
              >
                <CalendarIcon className="w-4 h-4" />
                Holiday List
              </button>
              <button 
                onClick={() => handleFeatureNotImplemented('Academic Policies')}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-[#2B579A] hover:text-[#2B579A] transition-all shadow-sm active:scale-95"
              >
                <ShieldCheck className="w-4 h-4" />
                Academic Policies
              </button>
            </div>
          </div>

          {/* View Calendar CTA */}
          <div className="bg-gradient-to-r from-[#2B579A] to-[#1e3e6d] p-8 rounded-xl shadow-lg text-white relative overflow-hidden group">
            <div className="relative z-10">
              <h2 className="text-2xl font-bold mb-2">Academic Calendar 2025-26</h2>
              <p className="text-white/80 mb-6 max-w-md">
                {isFinalised 
                  ? "The official academic calendar has been finalized. View all important dates, exams, and holidays."
                  : "The academic calendar is currently being updated. Please check back later for the finalized schedule."}
              </p>
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={() => {
                    if (isFinalised || userRole === 'admin') {
                      setIsCalendarViewOnly(true);
                      setShowDashboard(false);
                    } else {
                      alert("The calendar has not been finalized yet.");
                    }
                  }}
                  className="px-6 py-3 bg-white text-[#2B579A] rounded-lg font-bold hover:bg-blue-50 transition-all shadow-md active:scale-95 flex items-center gap-2"
                >
                  <CalendarIcon className="w-5 h-5" />
                  View Finalised Calendar
                </button>
                {userRole === 'admin' && (
                  <button 
                    onClick={() => {
                      setIsCalendarViewOnly(false);
                      setShowDashboard(false);
                    }}
                    className="px-6 py-3 bg-amber-500 text-white rounded-lg font-bold hover:bg-amber-600 transition-all shadow-md active:scale-95 flex items-center gap-2"
                  >
                    <Settings className="w-5 h-5" />
                    Manage Calendar
                  </button>
                )}
              </div>
            </div>
            <CalendarIcon className="absolute -right-8 -bottom-8 w-64 h-64 text-white/10 rotate-12 group-hover:rotate-6 transition-transform duration-500" />
          </div>
        </div>

        <div className="space-y-6">
          {/* Upcoming Events Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800">Upcoming Events</h3>
            </div>
            <div className="p-4 space-y-4">
              {upcoming.length > 0 ? upcoming.map((ev, idx) => (
                <div key={ev.id} className="flex items-center gap-4 group">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center text-white font-black text-lg shadow-md transition-transform group-hover:scale-110",
                    CATEGORY_COLORS[ev.category].bg
                  )}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 truncate group-hover:text-[#2B579A] transition-colors">{ev.title}</p>
                    <p className="text-xs font-medium text-slate-400">{format(ev.date, 'dd MMM yyyy')}</p>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-slate-500 text-center py-4">No upcoming events</p>
              )}
            </div>
          </div>

          {/* Next Exam Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800">Next Exam</h3>
            </div>
            <div className="p-6 flex flex-col items-center text-center">
              {exam ? (
                <>
                  <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mb-4 shadow-inner">
                    <CalendarIcon className="w-8 h-8" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-lg mb-1">{exam.title}</h4>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm font-medium text-slate-500">In</span>
                    <div className="bg-rose-500 text-white px-3 py-1 rounded-lg text-sm font-black shadow-sm">
                      {Math.ceil((exam.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))}
                    </div>
                    <span className="text-sm font-medium text-slate-500">Days</span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-500">No upcoming exams</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const YearlyList = ({ type }: { type: 'exam' | 'holiday' }) => {
    const listEvents = events
      .filter(e => e.category === type)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const handleDownload = () => {
      const headers = ['Date', 'End Date', 'Event Name', 'Location', 'Status'];
      const rows = listEvents.map(ev => [
        format(ev.date, 'dd MMM yyyy'),
        ev.endDate ? format(ev.endDate, 'dd MMM yyyy') : '-',
        ev.title,
        ev.location || ev.description || 'Main Campus',
        ev.date < today ? 'Completed' : 'Upcoming'
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `Academic_${type}_List_2025-26.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setYearlyListType(null)}
            className="flex items-center gap-2 text-slate-600 hover:text-[#2B579A] font-bold transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          <h2 className="text-2xl font-bold text-slate-800 capitalize">
            {type === 'exam' ? 'Yearly Exam Schedule' : 'Yearly Holiday List'} 2025-26
          </h2>
          <button 
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-[#2B579A] text-white rounded-lg text-sm font-bold hover:bg-[#1e3e6d] transition-all shadow-md active:scale-95"
          >
            <Download className="w-4 h-4" />
            Download List
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Start Date</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">End Date</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Event Name</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Location / Details</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {listEvents.map((ev) => (
                <tr key={ev.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-700">{format(ev.date, 'dd MMM yyyy')}</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">{format(ev.date, 'EEEE')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {ev.endDate ? (
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700">{format(ev.endDate, 'dd MMM yyyy')}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">{format(ev.endDate, 'EEEE')}</span>
                      </div>
                    ) : (
                      <span className="text-slate-300 font-bold">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-2 h-2 rounded-full", CATEGORY_COLORS[ev.category].bg)}></div>
                      <span className="font-bold text-slate-800 group-hover:text-[#2B579A] transition-colors">{ev.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-500">{ev.location || ev.description || 'Main Campus'}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={cn(
                      "px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider",
                      ev.date < today ? "bg-slate-100 text-slate-400" : "bg-green-100 text-green-600"
                    )}>
                      {ev.date < today ? 'Completed' : 'Upcoming'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {listEvents.length === 0 && (
            <div className="p-12 text-center text-slate-500">
              No {type}s found for the current academic year.
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] text-slate-700 font-sans">
      {/* Blue Header */}
      <header className="bg-[#2B579A] text-white shadow-md">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#2B579A]">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">
              {userRole === 'admin' ? 'Academic Calendar Builder' : 'Academic Calendar'}
            </h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 mr-4">
              <div className="relative">
                <Bell 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={cn(
                    "w-5 h-5 cursor-pointer transition-all active:scale-90",
                    notifications.some(n => !n.isRead) ? "text-amber-400" : "text-white/70 hover:text-white"
                  )} 
                />
                {notifications.some(n => !n.isRead) && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full border border-[#2B579A]" />
                )}
                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 overflow-hidden text-slate-800"
                    >
                      <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                        <h4 className="font-bold text-sm">Notifications</h4>
                        <button 
                          onClick={() => setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))}
                          className="text-[10px] font-bold text-blue-600 hover:underline"
                        >
                          Mark all as read
                        </button>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-slate-400">
                            <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            <p className="text-xs">No notifications yet</p>
                          </div>
                        ) : (
                          notifications.map(n => (
                            <div key={n.id} className={cn("px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors", !n.isRead && "bg-blue-50/30")}>
                              <p className="text-xs font-bold text-slate-800">{n.title}</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">{n.message}</p>
                              <p className="text-[9px] text-slate-400 mt-1">{format(n.date, 'dd MMM, HH:mm')}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </div>
              {userRole === 'hod' && (
                <div className="relative">
                  <ShieldCheck 
                    onClick={() => setShowHODRequests(!showHODRequests)}
                    className={cn(
                      "w-5 h-5 cursor-pointer transition-all active:scale-90",
                      changeRequests.some(r => r.status === 'pending') ? "text-amber-400" : "text-white/70 hover:text-white"
                    )} 
                  />
                  {changeRequests.some(r => r.status === 'pending') && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full border border-[#2B579A]" />
                  )}
                </div>
              )}
              <FileText 
                onClick={() => handleFeatureNotImplemented('Documents')}
                className="w-5 h-5 text-white/70 cursor-pointer hover:text-white transition-all active:scale-90" 
              />
            </div>
            <div className="relative">
              <div 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-4 cursor-pointer hover:bg-white/10 p-1.5 rounded-lg transition-all active:scale-[0.98]"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold leading-none">
                    {userRole === 'student' ? 'Ananya Sharma' : userRole === 'faculty' ? 'Dr. Rajesh Kumar' : 'Admin'}
                  </p>
                  <p className="text-[10px] font-medium opacity-80 mt-1">
                    {userRole === 'student' ? 'TY BCA Science' : userRole === 'faculty' ? 'Senior Professor' : 'Higher Authority'}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-white/30 overflow-hidden shadow-sm">
                  <img 
                    src={userRole === 'student' ? "https://picsum.photos/seed/student/100/100" : "https://picsum.photos/seed/faculty/100/100"} 
                    alt="Avatar" 
                    referrerPolicy="no-referrer" 
                  />
                </div>
                <ChevronDown className={cn("w-4 h-4 opacity-60 transition-transform", isProfileOpen && "rotate-180")} />
              </div>

              {isProfileOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setIsProfileOpen(false)}
                  />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-20 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Signed in as</p>
                      <p className="text-sm font-bold text-slate-800 capitalize">
                        {userRole === 'admin' ? 'Admin Chair' : userRole}
                      </p>
                    </div>
                    
                    <button 
                      onClick={() => handleFeatureNotImplemented('Profile')}
                      className="w-full px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-3 transition-all active:scale-[0.98]"
                    >
                      <User className="w-4 h-4" />
                      View Profile
                    </button>
                    <button 
                      onClick={() => handleFeatureNotImplemented('Account Settings')}
                      className="w-full px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-3 transition-all active:scale-[0.98]"
                    >
                      <Settings className="w-4 h-4" />
                      Account Settings
                    </button>
                    
                    <div className="h-px bg-slate-100 my-1" />
                    
                    <button 
                      onClick={handleLogout}
                      className="w-full px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-3 transition-all font-bold active:scale-[0.98]"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </motion.div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className={cn(
        "max-w-[1600px] mx-auto p-6 space-y-6",
        userRole === 'admin' && "px-4"
      )}>
        {yearlyListType ? (
          <YearlyList type={yearlyListType} />
        ) : showDashboard ? (
          <Dashboard />
        ) : (
          <>
            {/* Back button for calendar view */}
            <div className="flex items-center justify-between mb-2">
              <button 
                onClick={() => setShowDashboard(true)}
                className="flex items-center gap-2 text-slate-600 hover:text-[#2B579A] font-bold transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
                Back to Dashboard
              </button>
              {userRole === 'admin' && isFinalised && (
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <Check className="w-3 h-3" />
                  Calendar Finalized
                </span>
              )}
            </div>

            {/* Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {userRole === 'admin' && !isCalendarViewOnly ? (
              <>
                <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm px-3 py-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Institute:</span>
                  <select 
                    value={selectedInstitute}
                    onChange={(e) => setSelectedInstitute(e.target.value)}
                    className="text-sm font-bold text-slate-700 bg-transparent outline-none cursor-pointer min-w-[100px]"
                  >
                    <option value="">Select</option>
                    <option value="SOIT">SOIT</option>
                    <option value="Engineering Institute">Engineering Institute</option>
                  </select>
                </div>
                <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm px-3 py-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Course:</span>
                  <select 
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="text-sm font-bold text-slate-700 bg-transparent outline-none cursor-pointer min-w-[100px]"
                  >
                    <option value="">Select</option>
                    <option value="BCA Science">BCA Science</option>
                    <option value="Computer Science">Computer Science</option>
                  </select>
                </div>
                <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm px-3 py-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Year:</span>
                  <select 
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="text-sm font-bold text-slate-700 bg-transparent outline-none cursor-pointer min-w-[100px]"
                  >
                    <option value="">Select</option>
                    <option value="2025-2026">2025-2026</option>
                    <option value="2026-27">2026-27</option>
                  </select>
                </div>
                <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm px-3 py-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Semester:</span>
                  <select 
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value)}
                    className="text-sm font-bold text-slate-700 bg-transparent outline-none cursor-pointer min-w-[100px]"
                  >
                    <option value="">Select</option>
                    <option value="Semester 1">Semester 1</option>
                    <option value="Semester II">Semester II</option>
                  </select>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm px-4 py-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-3">Academic Year</span>
                  <span className="text-sm font-bold text-[#2B579A]">2025—26</span>
                </div>
                <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm px-4 py-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-3">Semester</span>
                  <span className="text-sm font-bold text-[#2B579A]">II</span>
                </div>
                {userRole === 'faculty' && (
                  <button 
                    onClick={() => setShowMyEventsOnly(!showMyEventsOnly)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border",
                      showMyEventsOnly 
                        ? "bg-[#2B579A] text-white border-[#2B579A]" 
                        : "bg-white text-slate-600 border-slate-200 hover:border-[#2B579A]"
                    )}
                  >
                    <User className="w-4 h-4" />
                    {showMyEventsOnly ? "Showing My Events" : "Show My Events Only"}
                  </button>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center bg-white border border-slate-300 rounded p-1">
              {(['month', 'list', 'week'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    "px-4 py-1 rounded text-sm font-medium transition-all capitalize flex items-center gap-2 active:scale-95",
                    view === v ? "bg-[#2B579A] text-white shadow-md" : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  {v === 'month' && <Layout className="w-4 h-4" />}
                  {v === 'week' && <CalendarIcon className="w-4 h-4" />}
                  {v === 'list' && <Clock className="w-4 h-4" />}
                  {v}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {userRole === 'admin' && !isCalendarViewOnly ? (
                <div className="flex items-center gap-2">
                  {selectedDates.length > 0 && (
                    <div className="flex items-center gap-2 mr-2 pr-2 border-r border-slate-200">
                      <span className="text-xs font-bold text-slate-500">{selectedDates.length} Selected</span>
                      <button 
                        onClick={() => setIsBulkUpdateOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm font-bold hover:bg-amber-600 transition-all shadow-md active:scale-95"
                      >
                        <Edit2 className="w-4 h-4" />
                        Update
                      </button>
                      <button 
                        onClick={handleDeleteSelected}
                        className="flex items-center gap-2 px-3 py-1.5 bg-rose-500 text-white rounded-lg text-sm font-bold hover:bg-rose-600 transition-all shadow-md active:scale-95"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                      <button 
                        onClick={() => setSelectedDates([])}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                        title="Clear selection"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <button 
                    onClick={() => {
                      if (!isCalendarLoaded) {
                        alert("Please load a calendar first by selecting the Institute, Course, Year, and Semester.");
                        return;
                      }
                      setIsBulkMode(true);
                    }}
                    className="flex items-center gap-2 px-4 py-1.5 bg-slate-600 text-white rounded-lg text-sm font-bold hover:bg-slate-700 transition-all shadow-md active:scale-95"
                  >
                    <PlusSquare className="w-4 h-4" />
                    Bulk Events
                  </button>
                  <button 
                    onClick={handleGlobalSave}
                    className="flex items-center gap-2 px-4 py-1.5 bg-[#4CAF50] text-white rounded-lg text-sm font-bold hover:bg-[#43A047] transition-all shadow-md active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    Finalize Calendar
                  </button>
                  <button 
                    onClick={() => {
                      if (!isCalendarLoaded) {
                        alert("Please load a calendar first.");
                        return;
                      }
                      setIsBulkManageOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all shadow-md active:scale-95"
                  >
                    <Settings className="w-4 h-4" />
                    Bulk Manage
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleExportFullCalendar}
                    className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-all shadow-md active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    Export Full Calendar
                  </button>
                  <button 
                    onClick={() => window.alert("PDF generation is being prepared. This feature will be available shortly.")}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer active:scale-95 transition-all"
                  >
                    <Download className="w-4 h-4 text-[#2B579A]" />
                    Download PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={cn(
          "grid gap-6",
          userRole === 'admin' 
            ? "grid-cols-1 lg:grid-cols-[1fr_320px]" 
            : "grid-cols-1 lg:grid-cols-4"
        )}>
          {/* Main Calendar Area */}
          <div className={cn(
            "space-y-6",
            userRole === 'admin' ? "lg:col-span-1" : "lg:col-span-3"
          )}>
            {!isCalendarLoaded && userRole === 'admin' ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-[#2B579A] mb-6">
                  <CalendarIcon className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Calendar Not Loaded</h3>
                <p className="text-slate-500 max-w-md mx-auto">
                  Please select the Institute, Course, Academic Year, and Semester above, then click <strong>"Load Calendar"</strong> to start managing the academic schedule.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
              {/* Category Legend */}
              <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-center gap-6">
                <div 
                  onClick={() => { setSelectedCategory('all'); }}
                  className={cn(
                    "flex items-center gap-2 cursor-pointer px-2 py-1 rounded transition-all active:scale-95",
                    selectedCategory === 'all' ? "bg-slate-100" : "hover:bg-slate-50"
                  )}
                >
                  <div className="w-4 h-4 rounded-sm border border-slate-300 bg-white"></div>
                  <span className="text-sm font-medium text-slate-600">All</span>
                </div>
                {(Object.keys(CATEGORY_COLORS) as EventCategory[]).map((cat) => (
                  <div 
                    key={cat} 
                    onClick={() => { setSelectedCategory(cat); }}
                    className={cn(
                      "flex items-center gap-2 cursor-pointer px-2 py-1 rounded transition-all active:scale-95",
                      selectedCategory === cat ? "bg-slate-100" : "hover:bg-slate-50"
                    )}
                  >
                    <div className={cn("w-4 h-4 rounded-sm", CATEGORY_COLORS[cat].bg)}></div>
                    <span className="text-sm font-medium text-slate-600">{CATEGORY_LABELS[cat]}</span>
                  </div>
                ))}
              </div>

              {/* Calendar Header */}
              <div className="p-4 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <button onClick={prev} className="p-1 hover:bg-slate-100 rounded border border-slate-200 active:scale-90 transition-all">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button onClick={next} className="p-1 hover:bg-slate-100 rounded border border-slate-200 active:scale-90 transition-all">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center gap-2 cursor-pointer">
                  <h2 className="text-xl font-bold text-slate-800">
                    {view === 'week' 
                      ? `Week of ${format(startOfWeek(currentDate), 'MMM d, yyyy')}`
                      : format(currentDate, 'MMMM yyyy')
                    }
                  </h2>
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                </div>
                <button 
                  onClick={() => setCurrentDate(new Date(2026, 2, 1))}
                  className="text-sm font-bold text-[#2B579A] hover:underline active:scale-95 transition-all"
                >
                  Today
                </button>
              </div>

              {/* Weekdays */}
              <div className="grid grid-cols-7 border-y border-slate-200">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="py-2 text-center text-xs font-bold text-slate-500 bg-slate-50 border-r border-slate-200 last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>

              {/* Days Grid - Month/Week View */}
              {(view === 'month' || view === 'week') && (
                <div className={cn(
                  "grid grid-cols-7",
                  view === 'week' && "bg-slate-50/30"
                )}>
                  {calendarDays.map((day, idx) => {
                    const dayEvents = getEventsForDay(day);
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isToday = isSameDay(day, today);
                    const isHovered = hoveredDay && isSameDay(day, hoveredDay);

                    return (
                      <div 
                        key={idx} 
                        onMouseEnter={() => setHoveredDay(day)}
                        onMouseLeave={() => setHoveredDay(null)}
                        onClick={() => userRole === 'admin' && !isCalendarViewOnly && toggleDateSelection(day)}
                        className={cn(
                          "min-h-[120px] border-r border-b border-slate-200 p-1 relative transition-all duration-200",
                          userRole === 'admin' && !isCalendarViewOnly && "cursor-pointer",
                          !isCurrentMonth && view === 'month' && "bg-slate-50/50 opacity-60",
                          isToday && "bg-blue-50/40",
                          isHovered && "bg-white shadow-inner ring-1 ring-inset ring-slate-200 z-10",
                          selectedDates.some(d => isSameDay(d, day)) && "bg-blue-50/80 ring-2 ring-inset ring-blue-500 z-20"
                        )}
                      >
                        <div className="flex justify-between items-start p-1">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                              {view === 'week' && format(day, 'EEE')}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className={cn(
                              "text-xs font-bold",
                              isToday ? "bg-[#2B579A] text-white w-6 h-6 flex items-center justify-center rounded-full shadow-sm" : 
                              isCurrentMonth || view === 'week' ? "text-slate-700" : "text-slate-300"
                            )}>
                              {format(day, 'd')}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 px-1 space-y-1">
                          {dayEvents.map((event) => (
                            <div
                              key={event.id}
                              className={cn(
                                "px-2 py-1 rounded-sm text-[10px] font-bold text-center truncate shadow-sm group relative",
                                CATEGORY_COLORS[event.category].bg,
                                CATEGORY_COLORS[event.category].text
                              )}
                            >
                              {event.title}
                              {userRole === 'admin' && !isCalendarViewOnly && (
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition-opacity rounded-sm">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleEditEvent(event); }}
                                    className="p-0.5 hover:bg-white/20 rounded cursor-pointer active:scale-90 transition-all"
                                  >
                                    <Edit2 className="w-3 h-3 text-white" />
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id); }}
                                    className="p-0.5 hover:bg-white/20 rounded cursor-pointer active:scale-90 transition-all"
                                  >
                                    <Trash2 className="w-3 h-3 text-white" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Hover Event List */}
                        {isHovered && dayEvents.length > 0 && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="absolute left-1/2 -translate-x-1/2 top-full mt-2 bg-white border border-slate-200 shadow-2xl rounded-lg p-3 z-50 min-w-[200px] pointer-events-none"
                          >
                            <div className="flex items-center justify-between mb-2 border-b border-slate-100 pb-2">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {format(day, 'EEEE, MMMM do')}
                              </p>
                              <span className="text-[10px] font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                                {dayEvents.length} {dayEvents.length === 1 ? 'Event' : 'Events'}
                              </span>
                            </div>
                            <div className="space-y-2">
                              {dayEvents.map(event => (
                                <div key={event.id} className="flex items-start gap-2.5">
                                  <div className={cn("w-2 h-2 rounded-full mt-1 shrink-0", CATEGORY_COLORS[event.category].bg)}></div>
                                  <div className="min-w-0">
                                    <p className="text-[11px] font-bold text-slate-800 leading-tight">{event.title}</p>
                                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                                      <p className="text-[9px] font-medium text-slate-400 uppercase">{CATEGORY_LABELS[event.category]}</p>
                                      {event.time && <p className="text-[9px] font-bold text-[#2B579A]">{event.time}</p>}
                                      {event.location && <p className="text-[9px] font-medium text-slate-500 italic">{event.location}</p>}
                                    </div>
                                    {event.facultyName && (
                                      <p className="text-[8px] font-bold text-slate-400 mt-0.5">
                                        Faculty: {event.facultyName} {event.facultyId ? `(${event.facultyId})` : ''}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-t border-l border-slate-200 rotate-45"></div>
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* List View */}
              {view === 'list' && (
                <div className="divide-y divide-slate-100 max-h-[700px] overflow-y-auto scroll-smooth">
                  {(() => {
                    const daysWithEvents = eachDayOfInterval({ start: monthStart, end: monthEnd })
                      .filter(day => getEventsForDay(day).length > 0);

                    if (daysWithEvents.length === 0) {
                      return (
                        <div className="p-12 text-center">
                          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CalendarIcon className="w-8 h-8 text-slate-200" />
                          </div>
                          <p className="text-slate-400 font-medium">
                            No {selectedCategory === 'all' ? '' : CATEGORY_LABELS[selectedCategory as EventCategory]} events scheduled for this month.
                          </p>
                        </div>
                      );
                    }

                    return daysWithEvents.map((day) => {
                      const dayEvents = getEventsForDay(day);
                      const isToday = isSameDay(day, today);
                      
                      return (
                        <div key={day.toISOString()} className={cn(
                          "p-4 hover:bg-slate-50 transition-colors flex items-start gap-8",
                          isToday && "bg-blue-50/30"
                        )}>
                          <div className="w-20 text-center shrink-0">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{format(day, 'EEEE')}</p>
                            <div className={cn(
                              "w-12 h-12 mx-auto rounded-xl flex items-center justify-center text-xl font-black shadow-sm",
                              isToday ? "bg-[#2B579A] text-white" : "bg-white border border-slate-200 text-slate-800"
                            )}>
                              {format(day, 'dd')}
                            </div>
                          </div>
                          <div className="flex-1 space-y-3">
                            {dayEvents.map(event => (
                              <div key={event.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-4">
                                  <div className={cn("w-4 h-4 rounded-full shadow-inner", CATEGORY_COLORS[event.category].bg)}></div>
                                  <div>
                                    <h4 className="text-sm font-bold text-slate-800">{event.title}</h4>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{CATEGORY_LABELS[event.category]}</span>
                                      {event.time && (
                                        <>
                                          <span className="text-slate-300">•</span>
                                          <span className="text-[10px] font-bold text-[#2B579A]">{event.time}</span>
                                        </>
                                      )}
                                      {event.location && (
                                        <>
                                          <span className="text-slate-300">•</span>
                                          <span className="text-[10px] font-bold text-indigo-600">{event.location}</span>
                                        </>
                                      )}
                                      {event.facultyName && (
                                        <>
                                          <span className="text-slate-300">•</span>
                                          <span className="text-[10px] font-bold text-slate-500">Faculty: {event.facultyName}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {userRole === 'admin' && !isCalendarViewOnly && (
                                    <>
                                      <button 
                                        onClick={() => handleEditEvent(event)}
                                        className="p-2 text-slate-400 hover:text-blue-600 transition-all cursor-pointer active:scale-90"
                                        title="Edit Event"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteEvent(event.id)}
                                        className="p-2 text-slate-400 hover:text-rose-600 transition-all cursor-pointer active:scale-90"
                                        title="Delete Event"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                  <button 
                                    onClick={() => handleFeatureNotImplemented('Event Details')}
                                    className="p-2 text-slate-300 hover:text-[#2B579A] transition-all cursor-pointer active:scale-90"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          )}

            {/* Quick Links Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-bold text-slate-800">Quick Links</h3>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => setYearlyListType('exam')}
                    className="flex items-center gap-2 px-4 py-1.5 bg-white border border-slate-300 rounded shadow-sm text-sm font-medium hover:bg-slate-50 active:scale-95 transition-all"
                  >
                    <PlusSquare className="w-4 h-4 text-[#2B579A]" />
                    Exam Schedule
                  </button>
                  <button 
                    onClick={() => setYearlyListType('holiday')}
                    className="flex items-center gap-2 px-4 py-1.5 bg-white border border-slate-300 rounded shadow-sm text-sm font-medium hover:bg-slate-50 active:scale-95 transition-all"
                  >
                    <Layout className="w-4 h-4 text-[#2B579A]" />
                    Holiday List
                  </button>
                  <button 
                    onClick={() => handleFeatureNotImplemented('Academic Policies')}
                    className="flex items-center gap-2 px-4 py-1.5 bg-white border border-slate-300 rounded shadow-sm text-sm font-medium hover:bg-slate-50 active:scale-95 transition-all"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#2B579A]" />
                    Academic Policies
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800">Upcoming Events</h3>
              </div>
              <div className="p-4 space-y-4">
                {upcomingEvents.map((event, idx) => (
                  <div key={event.id} className="flex gap-4 items-center">
                    <div className={cn(
                      "w-8 h-8 rounded flex items-center justify-center text-white font-bold shrink-0",
                      idx === 0 ? "bg-blue-500" : 
                      idx === 1 ? "bg-rose-500" : 
                      idx === 2 ? "bg-emerald-600" : 
                      idx === 3 ? "bg-indigo-600" : "bg-orange-500"
                    )}>
                      {idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-[#2B579A] truncate">
                        {event.title}
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 shrink-0">
                      {format(event.date, 'dd MMM yyyy')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Next Exam Widget */}
            <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-800">Next Exam</h3>
              </div>
              <div className="p-6 space-y-4">
                {nextExam && (
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-rose-50 rounded flex items-center justify-center text-rose-500 shrink-0">
                      <CalendarIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#2B579A]">{nextExam.title}</h4>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs text-slate-500">In</span>
                        <span className="px-2 py-0.5 bg-rose-500 text-white text-xs font-bold rounded">
                          {differenceInDays(nextExam.date, today)}
                        </span>
                        <span className="text-xs text-slate-500">Days</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            </div>
          </div>
          </>
        )}
      </main>

      {/* Save Success Toast */}
      {showSaveSuccess && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-[100] font-bold"
        >
          <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
            <Check className="w-4 h-4" />
          </div>
          Changes saved successfully!
        </motion.div>
      )}

      {/* Bulk Events Modal */}
      {isBulkMode && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden border border-slate-200"
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">Add Bulk Events</h3>
              <button onClick={() => setIsBulkMode(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {bulkEvents.map((be, index) => (
                <div key={be.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-wrap items-end gap-4 relative group">
                  <div className="flex-1 min-w-[200px] space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Event Name</label>
                    <input 
                      type="text" 
                      value={be.title}
                      onChange={(e) => updateBulkRow(be.id, 'title', e.target.value)}
                      placeholder="Enter event name"
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#2B579A] outline-none"
                    />
                  </div>
                  
                  <div className="w-40 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</label>
                    <select 
                      value={be.category}
                      onChange={(e) => updateBulkRow(be.id, 'category', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#2B579A] outline-none"
                    >
                      {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
                        <option key={cat} value={cat}>{label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="w-44 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Start Date</label>
                    <input 
                      type="date" 
                      value={be.date}
                      onChange={(e) => updateBulkRow(be.id, 'date', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#2B579A] outline-none"
                    />
                  </div>
                  
                  <div className="w-44 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">End Date</label>
                      <div className="flex items-center gap-1">
                        <input 
                          type="checkbox" 
                          id={`single-${be.id}`}
                          checked={be.isSingleDay}
                          onChange={(e) => updateBulkRow(be.id, 'isSingleDay', e.target.checked)}
                          className="w-3 h-3 rounded text-indigo-600"
                        />
                        <label htmlFor={`single-${be.id}`} className="text-[9px] font-bold text-indigo-600">1 Day</label>
                      </div>
                    </div>
                    <input 
                      type="date" 
                      value={be.endDate}
                      disabled={be.isSingleDay}
                      onChange={(e) => updateBulkRow(be.id, 'endDate', e.target.value)}
                      className={cn(
                        "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#2B579A] outline-none",
                        be.isSingleDay && "bg-slate-100 opacity-50"
                      )}
                    />
                  </div>
                  
                  <div className="w-32 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Time</label>
                    <input 
                      type="text" 
                      value={be.time}
                      onChange={(e) => updateBulkRow(be.id, 'time', e.target.value)}
                      placeholder="e.g. 10:00 AM"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#2B579A] outline-none"
                    />
                  </div>
                  
                  <div className="w-40 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</label>
                    <input 
                      type="text" 
                      value={be.location}
                      onChange={(e) => updateBulkRow(be.id, 'location', e.target.value)}
                      placeholder="Enter location"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#2B579A] outline-none"
                    />
                  </div>

                  <div className="w-44 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Faculty Name</label>
                    <input 
                      type="text" 
                      value={be.facultyName}
                      onChange={(e) => updateBulkRow(be.id, 'facultyName', e.target.value)}
                      placeholder="Faculty Name"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#2B579A] outline-none"
                    />
                  </div>

                  <div className="w-32 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Faculty ID</label>
                    <input 
                      type="text" 
                      value={be.facultyId}
                      onChange={(e) => updateBulkRow(be.id, 'facultyId', e.target.value)}
                      placeholder="ID"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#2B579A] outline-none"
                    />
                  </div>

                  <div className="flex-1 min-w-[200px] space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</label>
                    <input 
                      type="text" 
                      value={be.description}
                      onChange={(e) => updateBulkRow(be.id, 'description', e.target.value)}
                      placeholder="Enter description"
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#2B579A] outline-none"
                    />
                  </div>

                  {bulkEvents.length > 1 && (
                    <button 
                      onClick={() => removeBulkRow(be.id)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all active:scale-90"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
              
              <button 
                onClick={addBulkRow}
                className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold hover:border-[#2B579A] hover:text-[#2B579A] hover:bg-blue-50/30 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Another Event
              </button>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <button 
                onClick={() => setIsBulkMode(false)}
                className="px-8 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-all border border-slate-200 bg-white"
              >
                Cancel
              </button>
              <button 
                onClick={handleBulkSave}
                className="px-8 py-2.5 bg-[#007bff] text-white rounded-xl font-bold hover:bg-[#0069d9] transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
              >
                <Save className="w-5 h-5" />
                Save All Events
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add New Event Modal */}
      {isAddEventOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-[60] p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-[24px] shadow-2xl w-full max-w-[480px] overflow-hidden border border-slate-100"
          >
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">Add New Event</h3>
              <button 
                onClick={() => setIsAddEventOpen(false)} 
                className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">EVENT NAME *</label>
                <input 
                  type="text"
                  placeholder="e.g., Mid-Semester Exams"
                  value={newEvent.title || ''}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">EVENT TYPE *</label>
                  <div className="relative">
                    <select 
                      value={newEvent.category}
                      onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value as EventCategory })}
                      className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 outline-none appearance-none cursor-pointer"
                    >
                      {(Object.keys(CATEGORY_LABELS) as EventCategory[]).map(cat => (
                        <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">START DATE *</label>
                  <input 
                    type="date"
                    value={newEvent.date ? format(newEvent.date, 'yyyy-MM-dd') : ''}
                    onChange={(e) => setNewEvent({ ...newEvent, date: new Date(e.target.value + 'T00:00:00') })}
                    className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 outline-none"
                  />
                </div>
              </div>

              {!isSingleDay && (
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">END DATE *</label>
                  <input 
                    type="date"
                    value={newEvent.endDate ? format(newEvent.endDate, 'yyyy-MM-dd') : ''}
                    onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value ? new Date(e.target.value + 'T00:00:00') : undefined })}
                    className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 outline-none"
                  />
                </div>
              )}

              <div className="flex items-center gap-3">
                <div 
                  onClick={() => setIsSingleDay(!isSingleDay)}
                  className={cn(
                    "w-5 h-5 rounded-md flex items-center justify-center cursor-pointer transition-all",
                    isSingleDay ? "bg-violet-600 shadow-lg shadow-violet-200" : "border-2 border-slate-200 bg-white"
                  )}
                >
                  {isSingleDay && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                </div>
                <span 
                  className="text-sm font-medium text-slate-600 cursor-pointer select-none"
                  onClick={() => setIsSingleDay(!isSingleDay)}
                >
                  Single day event
                </span>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">TIME</label>
                  <input 
                    type="text"
                    placeholder="e.g., 10:00 AM"
                    value={newEvent.time || ''}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-300"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">LOCATION</label>
                  <input 
                    type="text"
                    placeholder="e.g., Main Auditorium"
                    value={newEvent.location || ''}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">FACULTY NAME</label>
                  <input 
                    type="text"
                    placeholder="Faculty Name"
                    value={newEvent.facultyName || ''}
                    onChange={(e) => setNewEvent({ ...newEvent, facultyName: e.target.value })}
                    className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-300"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">FACULTY ID</label>
                  <input 
                    type="text"
                    placeholder="ID"
                    value={newEvent.facultyId || ''}
                    onChange={(e) => setNewEvent({ ...newEvent, facultyId: e.target.value })}
                    className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-300"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">DESCRIPTION</label>
                <textarea 
                  placeholder="Add more details about the event..."
                  rows={4}
                  value={newEvent.description || ''}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 outline-none resize-none placeholder:text-slate-300"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setIsAddEventOpen(false)}
                  className="flex-1 border border-slate-200 rounded-xl py-3.5 text-sm font-bold text-slate-600 hover:bg-slate-50 active:scale-[0.98] transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveEvent}
                  className="flex-1 bg-[#007BFF] text-white rounded-xl py-3.5 text-sm font-bold hover:bg-[#0069D9] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20"
                >
                  <Save className="w-4 h-4" />
                  Save Event
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Bulk Manage Modal */}
      {isBulkManageOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[65] p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-200"
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
              <div className="flex items-center gap-3">
                <Settings className="w-6 h-6" />
                <h3 className="text-xl font-bold">Bulk Manage Events</h3>
              </div>
              <button onClick={() => setIsBulkManageOpen(false)} className="p-1 hover:bg-white/10 rounded transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
                    <input 
                      type="checkbox" 
                      checked={selectedEventIds.length === events.length && events.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedEventIds(events.map(ev => ev.id));
                        else setSelectedEventIds([]);
                      }}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <span className="text-xs font-bold text-slate-600">Select All</span>
                  </div>
                  <span className="text-sm font-bold text-slate-400">{selectedEventIds.length} events selected</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    disabled={selectedEventIds.length === 0}
                    onClick={() => setIsBulkUpdateOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-bold hover:bg-amber-600 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <Edit2 className="w-4 h-4" />
                    Update Selected
                  </button>
                  <button 
                    disabled={selectedEventIds.length === 0}
                    onClick={handleBulkDeleteEvents}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-lg text-sm font-bold hover:bg-rose-600 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Selected
                  </button>
                </div>
              </div>

              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <div className="max-h-[50vh] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                      <tr>
                        <th className="p-4 w-12"></th>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Event Title</th>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {events.sort((a, b) => a.date.getTime() - b.date.getTime()).map(event => (
                        <tr 
                          key={event.id}
                          className={cn(
                            "hover:bg-slate-50 transition-colors cursor-pointer",
                            selectedEventIds.includes(event.id) && "bg-blue-50/50"
                          )}
                          onClick={() => {
                            setSelectedEventIds(prev => 
                              prev.includes(event.id) ? prev.filter(id => id !== event.id) : [...prev, event.id]
                            );
                          }}
                        >
                          <td className="p-4">
                            <input 
                              type="checkbox" 
                              checked={selectedEventIds.includes(event.id)}
                              onChange={() => {}} // Handled by row click
                              className="w-4 h-4 rounded text-indigo-600"
                            />
                          </td>
                          <td className="p-4 font-bold text-slate-700 text-sm">{event.title}</td>
                          <td className="p-4">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                              CATEGORY_COLORS[event.category].bg,
                              CATEGORY_COLORS[event.category].text
                            )}>
                              {CATEGORY_LABELS[event.category]}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-slate-500 font-medium">
                            {format(event.date, 'MMM d, yyyy')}
                            {event.endDate && ` - ${format(event.endDate, 'MMM d, yyyy')}`}
                          </td>
                          <td className="p-4 text-sm text-slate-400">{event.location || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Bulk Update Modal */}
      {isBulkUpdateOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200"
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-amber-500 text-white">
              <h3 className="text-xl font-bold">Bulk Update Events</h3>
              <button onClick={() => setIsBulkUpdateOpen(false)} className="p-1 hover:bg-white/10 rounded transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <p className="text-sm text-slate-500">
                Updating <strong>{selectedEventIds.length || selectedDates.length}</strong> selected items.
              </p>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Category (Optional)</label>
                  <select 
                    value={bulkUpdateData.category || ''}
                    onChange={(e) => setBulkUpdateData(prev => ({ ...prev, category: e.target.value as EventCategory || undefined }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="">Keep original category</option>
                    {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
                      <option key={cat} value={cat}>{label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Title (Optional)</label>
                  <input 
                    type="text"
                    placeholder="Keep original title"
                    value={bulkUpdateData.title || ''}
                    onChange={(e) => setBulkUpdateData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Date (Optional)</label>
                  <input 
                    type="date"
                    value={bulkUpdateData.date || ''}
                    onChange={(e) => setBulkUpdateData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <button 
                onClick={() => setIsBulkUpdateOpen(false)}
                className="px-6 py-2 rounded-lg font-bold text-slate-600 hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (selectedEventIds.length > 0) handleBulkUpdateEventsSave();
                  else handleBulkUpdateSave();
                }}
                className="px-6 py-2 bg-amber-500 text-white rounded-lg font-bold hover:bg-amber-600 transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20"
              >
                <Save className="w-5 h-5" />
                Update Selected
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Finalize Summary Modal */}
      {isFinalizeModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200"
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-[#2B579A] text-white">
              <h3 className="text-xl font-bold">Academic Calendar Summary</h3>
              <button onClick={() => setIsFinalizeModalOpen(false)} className="p-1 hover:bg-white/10 rounded transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Institute</p>
                  <p className="text-sm font-bold text-slate-800">{selectedInstitute}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Course</p>
                  <p className="text-sm font-bold text-slate-800">{selectedCourse}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Academic Year</p>
                  <p className="text-sm font-bold text-slate-800">{selectedYear}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Semester</p>
                  <p className="text-sm font-bold text-slate-800">{selectedSemester}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                  <Layout className="w-4 h-4 text-[#2B579A]" />
                  Monthly Breakdown
                </h4>
                <div className="space-y-3">
                  {(() => {
                    const eventsByMonth: Record<string, AcademicEvent[]> = {};
                    events.forEach(e => {
                      const monthName = format(e.date, 'MMMM yyyy');
                      if (!eventsByMonth[monthName]) eventsByMonth[monthName] = [];
                      eventsByMonth[monthName].push(e);
                    });

                    return Object.entries(eventsByMonth).sort((a, b) => {
                      const dateA = new Date(a[0]);
                      const dateB = new Date(b[0]);
                      return dateA.getTime() - dateB.getTime();
                    }).map(([month, monthEvents]) => (
                      <div key={month} className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                          <span className="text-sm font-bold text-slate-700">{month}</span>
                          <span className="text-[10px] font-black bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-500">
                            {monthEvents.length} Events
                          </span>
                        </div>
                        <div className="p-3 space-y-2">
                          {monthEvents.map(e => (
                            <div key={e.id} className="flex items-center gap-3 text-xs">
                              <div className={cn("w-2 h-2 rounded-full shrink-0", CATEGORY_COLORS[e.category].bg)} />
                              <span className="font-bold text-slate-400 w-12">{format(e.date, 'dd MMM')}</span>
                              <span className="text-slate-700 font-medium truncate">{e.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <button 
                onClick={() => setIsFinalizeModalOpen(false)}
                className="px-6 py-2 rounded-lg font-bold text-slate-600 hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={confirmFinalize}
                className="px-6 py-2 bg-[#4CAF50] text-white rounded-lg font-bold hover:bg-[#43A047] transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <Check className="w-5 h-5" />
                Finalize & Publish
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* HOD Requests Modal */}
      {showHODRequests && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200"
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-6 h-6" />
                <h3 className="text-xl font-bold">Pending Change Requests</h3>
              </div>
              <button onClick={() => setShowHODRequests(false)} className="p-1 hover:bg-white/10 rounded transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {changeRequests.filter(r => r.status === 'pending').length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Check className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="font-bold">No pending requests</p>
                  <p className="text-sm">All changes have been processed.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {changeRequests.filter(r => r.status === 'pending').map(request => (
                    <div key={request.id} className="border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:border-indigo-200 transition-all">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold",
                          request.type === 'add' ? "bg-emerald-500" : 
                          request.type === 'update' ? "bg-amber-500" : "bg-rose-500"
                        )}>
                          {request.type === 'add' ? <Plus className="w-5 h-5" /> : 
                           request.type === 'update' ? <Edit2 className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded",
                              request.type === 'add' ? "bg-emerald-100 text-emerald-700" : 
                              request.type === 'update' ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                            )}>
                              {request.type} Request
                            </span>
                            <span className="text-xs text-slate-400">{format(request.requestDate, 'dd MMM, HH:mm')}</span>
                          </div>
                          <h4 className="font-bold text-slate-800 mt-1">{request.event.title}</h4>
                          <p className="text-xs text-slate-500">
                            {format(request.event.date, 'dd MMM yyyy')} 
                            {request.event.location && ` • ${request.event.location}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleRejectRequest(request)}
                          className="px-4 py-2 text-rose-600 font-bold text-sm hover:bg-rose-50 rounded-lg transition-all"
                        >
                          Reject
                        </button>
                        <button 
                          onClick={() => handleApproveRequest(request)}
                          className="px-4 py-2 bg-indigo-600 text-white font-bold text-sm rounded-lg hover:bg-indigo-700 transition-all shadow-md"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
