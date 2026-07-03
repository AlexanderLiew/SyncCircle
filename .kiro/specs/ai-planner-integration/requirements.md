# Requirements Document

## Introduction

The AI Planner Integration feature adds intelligent scheduling capabilities to SyncCircle through a conversational AI chatbot powered by Groq (Llama 3.3 70B). The chatbot can read and modify the user's timetable with explicit user confirmation, detect scheduling conflicts, check mutual availability with friends, and schedule group events with email notifications. All timetable actions require user approval via a "Confirm" button before any changes are made.

## Glossary

- **AI Chatbot**: The conversational interface on the AI Planner page that uses Groq's Llama 3.3 70B model to understand scheduling requests and propose timetable actions
- **Action Block**: A structured JSON command embedded in the AI's response (e.g., `[ACTION:ADD_CLASS]{...}[/ACTION]`) that the frontend parses into a confirmable action
- **Confirm Button**: A UI button shown below the AI's response when it proposes a timetable modification, requiring explicit user approval before execution
- **TimetableClass**: A recurring weekly class stored in localStorage with title, moduleCode, dayOfWeek, startTime, endTime, location, and color
- **Free Slot**: A contiguous time period between 08:00–22:00 where the user has no scheduled classes
- **Conflict**: When a proposed class/event's time range overlaps with an existing class on the same day

## Requirements

### Requirement 1: Add Class via Chat

**User Story:** As a student, I want to add a class to my timetable by telling the AI, so that I can manage my schedule through natural conversation.

#### Acceptance Criteria

1. WHEN the user requests to add a class (e.g., "Add Machine Learning on Monday 2pm to 4pm"), THE AI SHALL confirm the details and output an ADD_CLASS action block
2. THE Frontend SHALL parse the action block and display a "Confirm" button with a description of the action
3. WHEN the user clicks "Confirm", THE system SHALL save the class to localStorage via `saveClass()` and sync to the backend
4. THE AI SHALL ask clarifying questions if required information is missing (day, time, title)
5. THE system SHALL assign a random color from the app's palette and set source to 'personal'

### Requirement 2: Conflict Detection

**User Story:** As a student, I want the AI to warn me about scheduling conflicts, so that I don't accidentally double-book my time.

#### Acceptance Criteria

1. WHEN the user requests to add a class at a time that overlaps with an existing class, THE AI SHALL warn about the conflict and NOT output an action block
2. THE AI SHALL identify the conflicting class by name, day, and time
3. THE AI SHALL suggest alternative free time slots on the same day or nearby days
4. IF the user explicitly says "add it anyway" after a conflict warning, THEN THE AI SHALL output the action block allowing the override
5. Two time ranges conflict if: startA < endB AND startB < endA

### Requirement 3: Delete Class via Chat

**User Story:** As a student, I want to remove a class from my timetable by telling the AI, so that I can manage dropped courses easily.

#### Acceptance Criteria

1. WHEN the user requests to delete a class (e.g., "Remove Data Structures from Monday"), THE AI SHALL confirm which class and output a DELETE_CLASS action block
2. WHEN confirmed, THE system SHALL remove the class from localStorage via `deleteClass()` and sync to backend
3. THE AI SHALL match classes by title and dayOfWeek (case-insensitive)
4. IF the class is not found, THE system SHALL display an error message

### Requirement 4: Move Class via Chat

**User Story:** As a student, I want to reschedule a class to a different day/time, so that I can adjust my weekly routine.

#### Acceptance Criteria

1. WHEN the user requests to move a class (e.g., "Move Algorithms from Tuesday to Thursday same time"), THE AI SHALL ask whether to move (delete old + add new), keep both, or extend
2. IF the user says "move it", THE AI SHALL output a MOVE_CLASS action block with fromDay, toDay, newStartTime, newEndTime
3. WHEN confirmed, THE system SHALL update the class's dayOfWeek and time in localStorage
4. THE AI SHALL check the destination time slot for conflicts before proposing the action

### Requirement 5: Extend Class via Chat

**User Story:** As a student, I want to extend a class's end time, so that I can reflect schedule changes.

#### Acceptance Criteria

1. WHEN the user requests to extend a class (e.g., "Extend my Monday class until 12pm"), THE AI SHALL output an EXTEND_CLASS action block
2. WHEN confirmed, THE system SHALL update the class's endTime in localStorage
3. THE AI SHALL check for conflicts with the extended time before proposing

### Requirement 6: Find Free Time with Friends

**User Story:** As a student, I want to ask the AI when me and my friends are both free, so that we can plan study sessions together.

#### Acceptance Criteria

1. WHEN the user asks about mutual availability (e.g., "When are me and Alice free?"), THE AI SHALL check both timetables and list real mutual free slots
2. THE AI SHALL have access to the user's friends list and each friend's timetable data from localStorage
3. THE AI SHALL compute free slots by finding times where NEITHER person has a class (between 08:00–22:00)
4. IF a friend's timetable is empty or unavailable, THE AI SHALL inform the user
5. THE AI SHALL present free slots organized by day with specific time ranges

### Requirement 7: Schedule Group Events

**User Story:** As a student, I want to schedule a study session with friends and notify them, so that we can coordinate meetings.

#### Acceptance Criteria

1. WHEN the user wants to schedule a group event (e.g., "Schedule study with Alice on Thursday 4-6pm"), THE AI SHALL check both schedules for conflicts
2. IF both are free, THE AI SHALL output a SCHEDULE_EVENT action block with title, day, time, and friend names
3. WHEN confirmed, THE system SHALL add the event to the user's timetable AND show a toast notification "Email sent to [friend name]"
4. IF a friend has a conflict at the requested time, THE AI SHALL warn and suggest alternative mutual free slots
5. THE system SHALL NOT require the user to leave the chat page to complete this flow

### Requirement 8: Context Awareness

**User Story:** As a student, I want the AI to know my full schedule, so that its suggestions are accurate.

#### Acceptance Criteria

1. THE system SHALL pass the user's complete timetable (all classes with day/time/title) to the AI in every request
2. THE system SHALL pass pre-computed free time slots for each day (08:00–22:00 window)
3. THE system SHALL pass all friends and their timetable data to the AI
4. WHEN the user asks "What classes do I have?" or "What's my schedule?", THE AI SHALL accurately list their classes
5. THE AI SHALL use the context to make intelligent scheduling suggestions without requiring the user to repeat their schedule

### Requirement 9: User Confirmation Model

**User Story:** As a student, I want to approve all timetable changes before they happen, so that nothing changes without my permission.

#### Acceptance Criteria

1. THE system SHALL NOT modify the timetable without the user clicking "Confirm"
2. THE AI response SHALL display the action description in a clearly visible card with a "Confirm" button
3. AFTER confirmation, THE system SHALL display a success message indicating what was changed
4. IF execution fails, THE system SHALL display an error message explaining what went wrong

### Requirement 10: Chat Persistence

**User Story:** As a student, I want my chat history preserved, so that I can reference previous conversations.

#### Acceptance Criteria

1. THE system SHALL persist chat messages to localStorage
2. WHEN the user navigates away and returns to the AI Planner page, THE chat history SHALL be restored
3. THE user SHALL be able to clear chat history via a "Clear" button
4. WHEN cleared, all pending action buttons SHALL also be removed
