# Requirements Document

## Introduction

CramCircle (SyncCircle) is a student collaboration web app built for the AWS Kiro BuildFest 2026 Hackathon. It helps classmates coordinate schedules, share learning material, plan study sessions, and communicate in one place. The frontend is a working Vite React prototype at `SyncCircle/apps/frontend/` with pages for Auth, Dashboard, Timetable, Notes, AI Planner, Friends, Group Chat, Profile, and Settings. The backend uses Workato for orchestration, connecting the timetable to Google Calendar and syncing notes to Google Notes. AI features (summarization, chatbot planner) use the Kiro API.

## Glossary

- **CramCircle_App**: The complete student collaboration application including the Vite React frontend and Workato backend integrations
- **Frontend**: The Vite React single-page application at `SyncCircle/apps/frontend/` using React Router, Tailwind CSS, Radix UI, Lucide icons, and Motion animations
- **Workato_Backend**: The Workato-based backend orchestration layer that connects CramCircle features to external services (Google Calendar, Google Notes)
- **Kiro_API**: The AI service API used for note summarization and the AI Planner chatbot
- **Dashboard_Page**: The main landing page after login showing upcoming tasks, schedule highlights, and collaboration activity
- **Timetable_Page**: The page where users manage classes, view calendars, compare friend availability, and access their task list
- **Notes_Page**: The page where users create, organize, and share notes with AI summarization support
- **AI_Planner_Page**: The page hosting the Kiro API-powered chatbot for study planning and scheduling assistance
- **Friends_Page**: The page where users manage friend connections and view friend status
- **Settings_Page**: The page for managing Appearance, Notifications, Privacy & Security, Accessibility, Profile, and AI Preferences
- **SyncCircle_Icon**: The application logo/icon displayed in the navigation that serves as a home button
- **Study_Group**: A named collection of users who share notes and collaborate, joined via a group name and 4-digit password
- **User_Notes**: Personal notes organized in user-created folders by topic
- **Shared_Notes**: Notes shared within a Study_Group, organized in group-assigned folders
- **Friend_Availability_Dropdown**: A dropdown with checkboxes on the Timetable_Page allowing selection of friends whose timetables overlay on the calendar
- **Your_Calendar_Tab**: The tab on the Timetable_Page showing the user's class schedule and events
- **Your_Task_Tab**: The tab on the Timetable_Page showing the user's personal to-do list
- **Profile_Character**: The animated study character displayed on the user's profile page
- **Theme_Settings**: The appearance configuration allowing users to change the app's color scheme from the default darker purple

## Requirements

### Requirement 1: Global Navigation and SyncCircle Icon

**User Story:** As a student, I want to click the SyncCircle Icon from any page and return to the Dashboard, so that I always have a quick way to navigate home.

#### Acceptance Criteria

1. THE Frontend SHALL display the SyncCircle_Icon in the navigation bar on every authenticated page
2. WHEN a user clicks the SyncCircle_Icon, THE Frontend SHALL navigate the user to the Dashboard_Page
3. WHILE a user is on any authenticated page, THE SyncCircle_Icon SHALL remain visible and clickable in the navigation bar

### Requirement 2: User Authentication

**User Story:** As a student, I want to sign up, log in, and reset my password, so that I can securely access my personal dashboard and group features.

#### Acceptance Criteria

1. WHEN a user submits registration details with a valid email address and a password of at least 8 characters, THE CramCircle_App SHALL create a new user account and redirect the user to the Dashboard_Page
2. WHEN a user submits valid login credentials, THE CramCircle_App SHALL authenticate the user and redirect to the Dashboard_Page
3. WHEN a user requests a password reset with a registered email, THE CramCircle_App SHALL send a password reset link to the provided email address
4. IF a user submits registration details with an invalid email format, a password shorter than 8 characters, or an email already registered, THEN THE CramCircle_App SHALL display an error message indicating which field failed validation
5. IF a user submits incorrect login credentials, THEN THE CramCircle_App SHALL display a generic authentication failure message without revealing whether the email or password was incorrect

### Requirement 3: Dashboard Page

**User Story:** As a student, I want a Dashboard overview after logging in, so that I can see my upcoming tasks, schedule highlights, and collaboration activity at a glance.

#### Acceptance Criteria

1. WHEN an authenticated user navigates to the Dashboard_Page, THE Frontend SHALL display upcoming tasks, today's schedule highlights, and recent collaboration activity
2. THE Dashboard_Page SHALL serve as the default landing page after successful authentication
3. WHEN a user clicks on a scheduled class item on the Dashboard_Page, THE Frontend SHALL navigate to the Timetable_Page with that class in focus

### Requirement 4: Timetable Page - Class Management

**User Story:** As a student, I want to add, view, edit, and delete my classes on the Timetable page, so that my academic schedule is accurately reflected.

#### Acceptance Criteria

1. WHEN a user clicks "Add Class" on the Timetable_Page, THE Frontend SHALL display a form to enter class details including title, module code, location, day of the week, start time, and end time
2. WHEN a user submits a valid class form with all required fields and an end time after the start time, THE Timetable_Page SHALL persist the class entry and display it on the calendar view
3. WHEN a user edits an existing class entry, THE Timetable_Page SHALL update the calendar to reflect the changes
4. WHEN a user deletes a class entry, THE Timetable_Page SHALL remove the class from the calendar view
5. IF a user submits a class form with missing required fields or an end time that is not after the start time, THEN THE Timetable_Page SHALL display an error message indicating the validation failure
6. THE Workato_Backend SHALL sync all class entries to the user's connected Google Calendar

### Requirement 5: Timetable Page - Friend Availability Comparison

**User Story:** As a student, I want to compare my timetable with selected friends' timetables, so that I can find common free time to study together.

#### Acceptance Criteria

1. THE Timetable_Page SHALL display a Friend_Availability_Dropdown button
2. WHEN a user clicks the Friend_Availability_Dropdown, THE Frontend SHALL display a dropdown containing checkboxes for each of the user's friends
3. WHEN a user selects one or more friends via checkboxes in the Friend_Availability_Dropdown, THE Timetable_Page SHALL overlay the selected friends' timetables on top of the user's calendar using visually distinct colors for each friend
4. WHEN a user deselects a friend in the Friend_Availability_Dropdown, THE Timetable_Page SHALL remove that friend's timetable overlay from the calendar view
5. WHILE friends' timetables are overlaid, THE Timetable_Page SHALL visually highlight time slots where the user and all selected friends are simultaneously free

### Requirement 6: Timetable Page - Calendar and Task Tabs

**User Story:** As a student, I want to toggle between my calendar view and my task list on the Timetable page, so that I can manage both my schedule and to-do items in one place.

#### Acceptance Criteria

1. THE Timetable_Page SHALL display two tabs: Your_Calendar_Tab and Your_Task_Tab
2. WHEN a user selects the Your_Calendar_Tab, THE Timetable_Page SHALL display the weekly calendar view with all classes and events
3. WHEN a user selects the Your_Task_Tab, THE Timetable_Page SHALL display the user's personal to-do list
4. WHEN a user creates a task in the Your_Task_Tab with a title and optional due date and priority (High, Medium, Low), THE Frontend SHALL persist the task and display it in the list
5. WHEN a user marks a task as complete in the Your_Task_Tab, THE Frontend SHALL move the task to a completed section
6. WHEN a user deletes a task in the Your_Task_Tab, THE Frontend SHALL remove the task from the list

### Requirement 7: Notes Page - User Notes and Shared Notes Tabs

**User Story:** As a student, I want separate tabs for my personal notes and group-shared notes, so that I can keep my personal study material organized while also accessing collaborative group notes.

#### Acceptance Criteria

1. THE Notes_Page SHALL display two tabs: "User's Notes" and "Shared Notes"
2. WHEN a user selects the "User's Notes" tab, THE Notes_Page SHALL display the user's personal notes organized in user-created folders by topic
3. WHEN a user creates a new folder in "User's Notes", THE Notes_Page SHALL allow the user to name the folder and organize notes within it
4. WHEN a user creates a new note in "User's Notes", THE Notes_Page SHALL allow the user to assign the note to an existing folder
5. WHEN a user selects the "Shared Notes" tab, THE Notes_Page SHALL display only notes that have been shared within Study_Groups the user belongs to
6. WHILE on the "Shared Notes" tab, THE Notes_Page SHALL organize shared notes in group-assigned folders corresponding to each Study_Group
7. THE Notes_Page SHALL NOT display react or emote icons on individual note items

### Requirement 8: Notes Page - AI Summarization

**User Story:** As a student, I want an AI summarize button on each note, so that I can get a quick summary of long notes without reading the entire content.

#### Acceptance Criteria

1. THE Notes_Page SHALL display an "AI Summarize" button on each individual note
2. WHEN a user clicks the "AI Summarize" button on a note, THE CramCircle_App SHALL send the note content to the Kiro_API for summarization
3. WHEN the Kiro_API returns a summary, THE Notes_Page SHALL display the generated summary within the note view
4. IF the Kiro_API fails to return a summary within 30 seconds, THEN THE Notes_Page SHALL display an error message indicating the summarization request timed out
5. IF the Kiro_API returns an error, THEN THE Notes_Page SHALL display a user-friendly error message and allow the user to retry

### Requirement 9: Notes Page - Group Join Mechanism

**User Story:** As a student, I want to join a study group's shared notes by entering the group chat name and a 4-digit password, so that I can access shared materials from verified groups.

#### Acceptance Criteria

1. THE Notes_Page "Shared Notes" tab SHALL display a "Join Group" button
2. WHEN a user clicks "Join Group", THE Frontend SHALL display a form requiring the group chat name and a 4-digit numeric password
3. WHEN a user submits a valid group chat name and correct 4-digit password, THE CramCircle_App SHALL add the user to the Study_Group and display the group's shared notes
4. IF a user submits an incorrect group name or 4-digit password combination, THEN THE CramCircle_App SHALL display an error message indicating the credentials are invalid without revealing which field was incorrect
5. IF a user attempts to join a Study_Group they are already a member of, THEN THE CramCircle_App SHALL display a message indicating they are already a member

### Requirement 10: Notes Page - Sync to Google Notes

**User Story:** As a student, I want my notes to sync to Google Notes via Workato, so that I can access my study materials from any device through Google's ecosystem.

#### Acceptance Criteria

1. WHEN a user creates or updates a note, THE Workato_Backend SHALL sync the note content to the user's connected Google Notes account
2. WHEN syncing notes to Google Notes, THE Workato_Backend SHALL preserve the note title and content
3. IF the Workato_Backend fails to sync a note to Google Notes, THEN THE CramCircle_App SHALL display a notification indicating the sync failure and allow the user to retry
4. WHEN a user connects their Google Notes account, THE Workato_Backend SHALL perform an initial sync of all existing notes

### Requirement 11: AI Planner Page - Kiro API Chatbot

**User Story:** As a student, I want a working AI chatbot on the AI Planner page that helps me plan my study schedule, so that I can get personalized scheduling suggestions based on my workload and availability.

#### Acceptance Criteria

1. THE AI_Planner_Page SHALL display a conversational chat interface powered by the Kiro_API
2. WHEN a user submits a message in the AI Planner chat, THE CramCircle_App SHALL send the message to the Kiro_API and display the response in the chat thread
3. THE Kiro_API chatbot SHALL provide study planning suggestions based on the user's timetable, tasks, and stated preferences
4. WHEN the Kiro_API returns a response, THE AI_Planner_Page SHALL display the response within 10 seconds of the user's message submission
5. IF the Kiro_API is unavailable or returns an error, THEN THE AI_Planner_Page SHALL display a user-friendly error message and allow the user to retry their message
6. THE AI_Planner_Page SHALL maintain conversation history within the current session so the chatbot can provide contextual follow-up responses

### Requirement 12: Friends Page

**User Story:** As a student, I want to manage my friend connections and view friend status, so that I can collaborate and compare schedules with classmates.

#### Acceptance Criteria

1. THE Friends_Page SHALL display a list of the user's current friends with their display names and online status
2. WHEN a user sends a friend request, THE CramCircle_App SHALL deliver the request to the target user
3. WHEN a user accepts a friend request, THE CramCircle_App SHALL add both users to each other's friend list
4. WHEN a user removes a friend, THE CramCircle_App SHALL remove the connection from both users' friend lists
5. THE Friends_Page SHALL allow searching for users by name or email to send friend requests

### Requirement 13: Group Chat (Optional Feature)

**User Story:** As a student, I want an optional group chat feature similar to Microsoft Teams, so that I can communicate with my study group members in real time.

#### Acceptance Criteria

1. WHERE the Group Chat feature is enabled, THE CramCircle_App SHALL display a Group Chat page accessible from the navigation
2. WHERE the Group Chat feature is enabled, WHEN a user sends a message in a group chat, THE Frontend SHALL display the message in the chat thread for all group members
3. WHERE the Group Chat feature is enabled, THE Frontend SHALL display message history when a user opens a group chat
4. WHERE the Group Chat feature is disabled, THE Frontend SHALL hide the Group Chat option from the navigation menu

### Requirement 14: UI Theme - Default Darker Purple with Customization

**User Story:** As a student, I want the app to have a darker purple theme by default (similar to the Kiro logo color), with the option to change colors in Settings, so that the interface feels cohesive and I can personalize it to my preference.

#### Acceptance Criteria

1. THE Frontend SHALL use a darker purple color scheme as the default theme across all pages
2. THE Theme_Settings in the Settings_Page Appearance section SHALL allow the user to select from at least 4 predefined color themes
3. WHEN a user selects a new color theme in Settings, THE Frontend SHALL immediately apply the selected theme across all pages
4. WHEN a user returns to the app after selecting a custom theme, THE Frontend SHALL persist and restore the user's selected theme preference

### Requirement 15: Settings Page - Full Feature Configuration

**User Story:** As a student, I want all Settings features to be usable, so that I can fully customize my experience including appearance, notifications, privacy, accessibility, profile details, and AI preferences.

#### Acceptance Criteria

1. THE Settings_Page SHALL provide functional sections for: Appearance, Notifications, Privacy & Security, Accessibility, Profile, and AI Preferences
2. WHEN a user updates Appearance settings (theme color, font size preference), THE Frontend SHALL persist the changes and apply them immediately
3. WHEN a user updates Notification settings (enable/disable push notifications, email notifications), THE CramCircle_App SHALL persist the preferences and respect them for future notifications
4. WHEN a user updates Privacy & Security settings (profile visibility, data sharing preferences), THE CramCircle_App SHALL persist and enforce the selected privacy rules
5. WHEN a user updates Accessibility settings (high contrast mode, reduced motion), THE Frontend SHALL persist the preferences and apply the corresponding visual adjustments
6. WHEN a user updates Profile settings (display name, avatar, course/program), THE CramCircle_App SHALL persist the profile changes and reflect them across the application
7. WHEN a user updates AI Preferences (response style, planning aggressiveness), THE CramCircle_App SHALL persist the preferences and pass them to the Kiro_API for subsequent AI interactions

### Requirement 16: Profile Page - Animated Study Character

**User Story:** As a student, I want an improved animated study character on my profile page, so that the app feels more engaging and personalized.

#### Acceptance Criteria

1. THE Profile page SHALL display an animated Profile_Character using a more expressive character design scheme than a static image
2. THE Profile_Character SHALL use Motion animations for idle, studying, and celebration states
3. WHEN a user completes a task or achieves a milestone, THE Profile_Character SHALL play a celebration animation
4. THE Profile_Character design SHALL follow an animated character scheme with expressive features and smooth transitions

### Requirement 17: Workato Backend Integration - Google Calendar Sync

**User Story:** As a student, I want my CramCircle timetable to sync with Google Calendar via Workato, so that my academic schedule is accessible from Google Calendar on any device.

#### Acceptance Criteria

1. WHEN a user connects their Google Calendar account through Settings, THE Workato_Backend SHALL establish a sync connection between CramCircle timetable and Google Calendar
2. WHEN a user adds, edits, or deletes a class in the Timetable_Page, THE Workato_Backend SHALL propagate the change to the user's connected Google Calendar within 60 seconds
3. THE Workato_Backend SHALL map CramCircle class fields (title, module code, location, day, start time, end time) to corresponding Google Calendar event fields
4. IF the Workato_Backend fails to sync a timetable change to Google Calendar, THEN THE CramCircle_App SHALL display a notification indicating the sync failure
5. WHEN a user disconnects their Google Calendar account, THE Workato_Backend SHALL stop syncing timetable changes and remove the connection

