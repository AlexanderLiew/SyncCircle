# Requirements Document

## Introduction

CramCircle is an educational dashboard MVP built for the AWS Kiro BuildFest 2026 Hackathon, targeting the "Most Practical Solution" category. It eliminates the administrative burden of student life by combining a shared group timetable, personal schedule blocking, collaborative notes, and an AI-driven scheduling assistant that automatically finds common free time for student groups. The system exposes a RESTful API connecting a frontend to a backend and AI services, with an efficient database schema optimized for overlapping time queries.

## Glossary

- **CramCircle_System**: The full-stack educational dashboard application including frontend, backend API, database, and AI service
- **Authentication_Service**: The subsystem responsible for user registration, login, and session management
- **Group_Service**: The subsystem responsible for creating, managing, and querying Study Groups
- **Timetable_Service**: The subsystem responsible for managing academic and personal calendar events
- **AI_Planner**: The conversational AI agent that processes natural language scheduling queries and computes available meeting slots
- **Notes_Service**: The subsystem responsible for managing collaborative text documents tied to academic events
- **Study_Group**: A named collection of users who share timetable visibility and collaborative features
- **Academic_Event**: A recurring calendar entry representing a fixed class, lecture, or tutorial with metadata (Module Code, Location, Title)
- **ICS_File**: A calendar file in iCalendar (.ics) format containing academic schedule data
- **Timetable_Grabber**: The subsystem that connects to university class schedule pages, extracts timetable data, and imports it as Academic_Events into the user's calendar
- **Event_Category**: A user-defined label with an associated color used to visually organize Personal_Events (e.g., "Gym" in green, "Meals" in orange)
- **Todo_Service**: The subsystem responsible for managing personal task lists for users
- **Todo_Item**: A personal task entry with a title, optional due date, priority level (High, Medium, Low), status (To Do, In Progress, Done, Delayed), optional associated Study_Group, and completion status
- **Personal_Event**: A one-off or recurring calendar entry representing blocked personal time (e.g., gym, meals)
- **Busy_Block**: The privacy-masked representation of a Personal_Event visible to other group members
- **Free_Window**: A contiguous time period where all members of a Study_Group have no scheduled events
- **Invite_Link**: A unique URL or email-based token that allows a user to join a specific Study_Group

## Requirements

### Requirement 1: User Registration and Authentication

**User Story:** As a student, I want to create an account and log in securely, so that I can access my personal dashboard and group features.

#### Acceptance Criteria

1. WHEN a user submits registration details with a valid email address (RFC 5322 format, maximum 254 characters) and a password between 8 and 128 characters, THE Authentication_Service SHALL create a new user account and return an authentication token
2. WHEN a user submits valid login credentials, THE Authentication_Service SHALL authenticate the user and return a session token that expires after 24 hours of inactivity
3. IF a user submits registration details with an invalid email format, a password shorter than 8 characters or longer than 128 characters, or an email that is already registered, THEN THE Authentication_Service SHALL return an error message indicating which field failed validation and the reason for failure
4. IF a user submits incorrect login credentials, THEN THE Authentication_Service SHALL return an AUTHENTICATION_FAILED error type without revealing whether the email or password was incorrect
5. IF a user fails login 5 times within a 15-minute window, THEN THE Authentication_Service SHALL temporarily block further login attempts for that account for 15 minutes and return an error message indicating the account is temporarily locked

### Requirement 2: Study Group Creation

**User Story:** As a student, I want to create a Study Group, so that I can collaborate with classmates on scheduling and notes.

#### Acceptance Criteria

1. WHEN an authenticated user submits a group name (1-100 characters), THE Group_Service SHALL create a new Study_Group and assign the creating user as a member
2. THE Group_Service SHALL generate a unique Invite_Link for each Study_Group upon creation
3. WHEN a user accesses a valid Invite_Link, THE Group_Service SHALL add the authenticated user to the corresponding Study_Group
4. IF a user accesses an invalid or expired Invite_Link, THEN THE Group_Service SHALL return an error message indicating whether the link is invalid or has expired
5. IF a user accesses an Invite_Link for a Study_Group they are already a member of, THEN THE Group_Service SHALL return a message indicating they are already a member without creating a duplicate membership

### Requirement 3: Multi-Group Membership

**User Story:** As a student, I want to belong to multiple Study Groups, so that I can collaborate with different sets of classmates for different modules.

#### Acceptance Criteria

1. THE Group_Service SHALL allow a user to be a member of up to 50 Study_Groups simultaneously
2. WHEN an authenticated user requests their groups, THE Group_Service SHALL return a list of all Study_Groups the user belongs to, including each group's name, member count, and creation date
3. WHEN an authenticated user requests a specific Study_Group they are a member of, THE Group_Service SHALL return the group details including the member list with display names
4. WHEN a user leaves a Study_Group, THE Group_Service SHALL remove the user from the group membership
5. IF a user attempts to join a Study_Group and their current membership count equals 50, THEN THE Group_Service SHALL reject the request and return an error message indicating the membership limit has been reached

### Requirement 4: Academic Event Management

**User Story:** As a student, I want to add, view, edit, and delete my recurring academic events (lectures, tutorials), so that my fixed class schedule is reflected in the timetable.

#### Acceptance Criteria

1. WHEN a user creates an Academic_Event with a title (1-100 characters), module code (1-20 characters), location (1-100 characters), recurrence pattern (one or more days of the week the event repeats on), start time, and end time, THE Timetable_Service SHALL persist the event and associate it with the user
2. WHEN a user requests their timetable for a date range of up to 90 days, THE Timetable_Service SHALL return all Academic_Event occurrences and Personal_Events that overlap with the requested range
3. WHEN a user updates an existing Academic_Event that they own, THE Timetable_Service SHALL persist the changes and reflect them in all Study_Group timetables where the user is a member
4. WHEN a user deletes an Academic_Event that they own, THE Timetable_Service SHALL remove the event and update all Study_Group timetables where the user is a member
5. IF a user submits an Academic_Event with missing required fields or with an end time that is not after the start time, THEN THE Timetable_Service SHALL reject the request and return an error message indicating the validation failure
6. IF a user attempts to update or delete an Academic_Event they do not own, THEN THE Timetable_Service SHALL reject the request and return an authorization error

### Requirement 5: Timetable Grabber and Import

**User Story:** As a student, I want CramCircle to grab my academic timetable directly from my university's class schedule page, so that I do not have to manually enter each class or rely on external tools.

#### Acceptance Criteria

1. WHEN a user initiates a timetable grab and provides their university class schedule URL or credentials, THE Timetable_Grabber SHALL extract the academic schedule data from the university portal within 30 seconds
2. THE Timetable_Grabber SHALL support class schedule extraction from SIT, NUS, SMU, and Singapore polytechnic portals
3. WHEN the Timetable_Grabber successfully extracts schedule data without errors or timeouts, THE Timetable_Grabber SHALL present the extracted Academic_Events to the user for confirmation before importing
4. WHEN the user confirms the extracted events, THE Timetable_Grabber SHALL create Academic_Events with title, module code, location, start time, end time, and recurrence pattern
5. WHEN a user uploads an ICS_File that is in valid iCalendar format containing at least one VEVENT component, does not exceed 5 MB in size, and contains no more than 500 VEVENT components, THE Timetable_Grabber SHALL parse the file and create Academic_Events for each calendar entry
6. IF a user uploads an ICS_File that contains more than 500 VEVENT components, THEN THE Timetable_Grabber SHALL reject the entire file and return an error message indicating the event count limit has been exceeded
7. IF the Timetable_Grabber cannot connect to or extract data from a university portal within 30 seconds, THEN THE Timetable_Grabber SHALL return an error message indicating the connection failure reason and suggest the ICS_File upload as a fallback
8. WHEN imported Academic_Events have a time range that overlaps with existing events for the same user, THE Timetable_Grabber SHALL flag the overlapping events as conflicts and allow the user to choose whether to overwrite or skip each conflicting entry
9. IF a user uploads an ICS_File that is not in valid iCalendar format, exceeds 5 MB, or contains no VEVENT components, THEN THE Timetable_Grabber SHALL reject the file and return an error message indicating the specific validation failure

### Requirement 6: Personal Event Management with Privacy Masking and Categories

**User Story:** As a student, I want to block personal time on my calendar with custom categories and colors while keeping the details private from group members, so that my schedule is visually organized and my availability is accurately reflected without exposing personal information.

#### Acceptance Criteria

1. WHEN a user creates a Personal_Event with a title (1-100 characters), start time, end time that is after the start time, optional recurrence pattern, and optional Event_Category, THE Timetable_Service SHALL persist the event and associate it with the user
2. WHEN a user creates an Event_Category with a name (1-50 characters) and a hex color code, THE Timetable_Service SHALL persist the category and make it available for the user's Personal_Events, up to a maximum of 20 categories per user
3. WHEN a user updates an Event_Category, THE Timetable_Service SHALL persist the changes and reflect the updated name or color on all associated Personal_Events
4. WHEN a user deletes an Event_Category, THE Timetable_Service SHALL remove the category and set the category association to none on all previously associated Personal_Events
5. WHEN a user updates an existing Personal_Event, THE Timetable_Service SHALL persist the changes
6. WHEN a user deletes a Personal_Event, THE Timetable_Service SHALL remove the event
7. WHEN a group member views another user's timetable, THE Timetable_Service SHALL display each Personal_Event as a Busy_Block showing only the time range without title, category, or details
8. WHEN a user views their own timetable, THE Timetable_Service SHALL display all Personal_Event details including the title, category name, and associated color
9. IF a user submits a Personal_Event or Event_Category with missing required fields or invalid values (end time not after start time, title exceeding 100 characters, or category limit exceeded), THEN THE Timetable_Service SHALL reject the request and return a descriptive error message indicating the validation failure; error messages SHALL only be returned when validation actually fails

### Requirement 7: AI Scheduling Query

**User Story:** As a student in a Study Group, I want to ask a natural language question about when we can meet, so that the AI finds common free time without me manually comparing everyone's schedules.

#### Acceptance Criteria

1. WHEN a user submits a natural language scheduling query within a Study_Group chat, THE AI_Planner SHALL parse the requested meeting duration from the query, accepting values between 15 minutes and 8 hours
2. IF the AI_Planner cannot determine the requested meeting duration from the query, THEN THE AI_Planner SHALL respond asking the user to specify how long the meeting should be
3. WHEN a scheduling query is triggered and the user does not specify a date range, THE AI_Planner SHALL default to searching the next 7 calendar days from the current date
4. WHEN a scheduling query is triggered, THE AI_Planner SHALL fetch the combined schedules of all members in the specified Study_Group for the determined time range
5. THE AI_Planner SHALL treat both Academic_Events and Personal_Events as strictly unavailable time when computing Free_Windows
6. WHEN computing Free_Windows, THE AI_Planner SHALL identify contiguous time periods between 08:00 and 22:00 local time where all group members have no scheduled events and that match or exceed the requested duration
7. THE AI_Planner SHALL respond with the top 3 available time slots ordered by earliest start time, each including the day, start time, end time, and the total slot duration
8. IF no Free_Windows matching the requested duration exist in the queried time range, THEN THE AI_Planner SHALL inform the user that no common availability was found and suggest trying a shorter duration or a different time range

### Requirement 8: Collaborative Notes Linked to Academic Events

**User Story:** As a student in a Study Group, I want to create and edit shared notes tied to upcoming lectures, so that my group can collaboratively prepare for classes.

#### Acceptance Criteria

1. WHEN a user creates a note within a Study_Group by providing a title (1 to 200 characters) and content (1 to 50,000 characters) and specifying an existing Academic_Event belonging to any member of the Study_Group, THE Notes_Service SHALL associate the note with that Academic_Event and persist the title and content
2. WHEN a user in the Study_Group requests notes for a specific Academic_Event, THE Notes_Service SHALL return the current content of the shared note document including its title, content, last-modified timestamp, and the identifier of the last editor
3. WHEN a user edits a shared note, THE Notes_Service SHALL persist the updated content, update the last-modified timestamp, and make the changes visible to all Study_Group members on their next retrieval request
4. THE Notes_Service SHALL support sequential editing by multiple users without data loss by persisting the most recent write (last-write-wins strategy)
5. WHEN a user requests all notes for a Study_Group, THE Notes_Service SHALL return a list of notes ordered by the associated Academic_Event date in ascending chronological order
6. IF a user attempts to create a note with an invalid or nonexistent Academic_Event, blank title, blank content, or content exceeding 50,000 characters, THEN THE Notes_Service SHALL reject the request and return a descriptive error message indicating the validation failure
7. IF a user attempts to create or edit a note in a Study_Group they are not a member of, THEN THE Notes_Service SHALL reject the request and return an authorization error

### Requirement 9: Personal To-Do List

**User Story:** As a student, I want a personal to-do list with status tracking and priority levels within CramCircle, so that I can organize and prioritize tasks, assignments, and reminders alongside my schedule.

#### Acceptance Criteria

1. WHEN a user creates a Todo_Item with a title (1 to 200 characters), optional due date, priority level (High, Medium, or Low), and initial status of "To Do", THE Todo_Service SHALL persist the task and associate it with the authenticated user
2. WHEN a user updates the status of a Todo_Item they own, THE Todo_Service SHALL allow selection from the following statuses: To Do, In Progress, Done, and Delayed
3. WHEN a user sets or updates the priority of a Todo_Item they own, THE Todo_Service SHALL persist the priority as High, Medium, or Low
4. WHEN a user requests their to-do list and the user is successfully authorized, THE Todo_Service SHALL return all Todo_Items owned by that user with status "To Do", "In Progress", or "Delayed", ordered by priority (High first, then Medium, then Low) and then by due date ascending, with items lacking a due date listed last within each priority group
5. WHEN a user requests completed tasks and explicit authorization validation confirms the user owns the requested items, THE Todo_Service SHALL return all Todo_Items owned by that user with status "Done" in reverse chronological order of completion date
6. WHEN a user updates a Todo_Item title, due date, priority, or status, THE Todo_Service SHALL validate that the title is between 1 and 200 characters (if changed) and persist the changes
7. WHEN a user deletes a Todo_Item and direct ownership verification confirms they own the item, THE Todo_Service SHALL remove the task permanently
8. IF a user attempts to create or update a Todo_Item with invalid data (empty title, title exceeding 200 characters, or unrecognized priority/status value), THEN THE Todo_Service SHALL reject the request and return a descriptive error message indicating the validation failure
9. IF a user attempts to access, update, or delete a Todo_Item they do not own, THEN THE Todo_Service SHALL reject the request and return an authorization error

### Requirement 10: RESTful API Design

**User Story:** As a developer, I want a well-structured RESTful API, so that the frontend can interact with backend services and AI features through consistent endpoints.

#### Acceptance Criteria

1. THE CramCircle_System SHALL expose RESTful API endpoints for all user, group, timetable, notes, and AI planner operations
2. THE CramCircle_System SHALL require a valid authentication token (non-expired and properly signed) for all API endpoints except registration and login, with tokens expiring after 24 hours of inactivity; expired tokens SHALL be treated as completely unauthenticated and result in a 401 response
3. WHEN an unauthenticated request is made to a protected endpoint, THE CramCircle_System SHALL return a 401 Unauthorized response
4. WHEN a user requests a resource belonging to a Study_Group they are not a member of, THE CramCircle_System SHALL return a 403 Forbidden response
5. THE CramCircle_System SHALL return HTTP status codes mapped as follows: 200 for successful retrieval or update, 201 for successful resource creation, 400 for malformed or invalid request parameters, 401 for missing or invalid authentication, 403 for insufficient permissions, 404 for non-existent resources, and 500 for unhandled server errors
6. THE CramCircle_System SHALL return all API responses in a consistent JSON structure containing a success indicator, a data field for successful responses, and an error field with a machine-readable error type and a human-readable message for error responses
7. IF a request contains missing required fields or values failing validation rules, THEN THE CramCircle_System SHALL return a 400 response with the error field identifying each invalid parameter and the reason for rejection
