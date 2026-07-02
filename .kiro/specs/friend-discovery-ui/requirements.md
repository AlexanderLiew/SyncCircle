# Requirements Document

## Introduction

This feature replaces the existing manual "Add Friend" form (which requires typing a name and email) with an Instagram-style friend discovery popup. The popup displays a scrollable list of all registered users from the database, allows searching by name, and lets users send friend requests with a single click. Additionally, the Group Chat navigation item is removed from the sidebar.

## Glossary

- **Discovery_Popup**: A modal overlay component that displays all registered users and provides search-by-name functionality for discovering and adding friends
- **User_Card**: A single row item within the Discovery_Popup showing a user's display name and an action button (Add Friend or Request Sent)
- **Users_API**: A new backend API endpoint that returns registered users from the UserProfiles DynamoDB table, supporting optional name-based filtering
- **Navigation_Sidebar**: The left-side navigation bar containing links to app sections (Dashboard, Timetable, Notes, AI Planner, Friends, Profile, Settings)
- **Friend_Request_System**: The existing backend system that manages sending, accepting, rejecting, and cancelling friend requests via the POST /friend-requests endpoint
- **Search_Bar**: A text input within the Discovery_Popup that filters the displayed user list by name
- **Current_User**: The authenticated user who is viewing and interacting with the Discovery_Popup

## Requirements

### Requirement 1: Discovery Popup Display

**User Story:** As a student, I want to browse all registered users in a popup so that I can easily find and add friends without needing to know their email address.

#### Acceptance Criteria

1. WHEN the Current_User clicks the "Add Friend" button on the Friends page, THE Discovery_Popup SHALL open as a modal overlay centered on the screen
2. THE Discovery_Popup SHALL display an X close button in the top-right corner
3. THE Discovery_Popup SHALL display a Search_Bar at the top of the popup below the header
4. THE Discovery_Popup SHALL display a scrollable list of all registered users retrieved from the Users_API
5. WHEN the Current_User clicks the X close button, THE Discovery_Popup SHALL close and return focus to the Friends page
6. WHEN the Current_User clicks outside the Discovery_Popup overlay area, THE Discovery_Popup SHALL close
7. THE Discovery_Popup SHALL exclude the Current_User from the displayed user list

### Requirement 2: User Card Display

**User Story:** As a student, I want to see each user's name with an Add Friend button so that I can quickly send friend requests.

#### Acceptance Criteria

1. THE User_Card SHALL display the user's display name
2. THE User_Card SHALL display an "Add Friend" button in the default state
3. WHILE a friend request from the Current_User to a displayed user is already pending, THE User_Card SHALL show a grey disabled "Request Sent" button instead of "Add Friend"
4. WHILE the displayed user is already a friend of the Current_User, THE User_Card SHALL hide the "Add Friend" button or show a "Friends" indicator

### Requirement 3: Send Friend Request from Discovery Popup

**User Story:** As a student, I want to send a friend request by clicking a single button so that adding friends requires minimal effort.

#### Acceptance Criteria

1. WHEN the Current_User clicks the "Add Friend" button on a User_Card, THE Friend_Request_System SHALL send a friend request to the selected user
2. WHEN a friend request is sent successfully, THE User_Card SHALL immediately change the button to a grey disabled "Request Sent" state
3. IF the friend request fails due to a network or server error, THEN THE Discovery_Popup SHALL display an error notification to the Current_User
4. WHILE a friend request is being sent, THE User_Card SHALL display a loading indicator on the button to prevent duplicate submissions

### Requirement 4: Search Users by Name

**User Story:** As a student, I want to search for specific users by name so that I can quickly find the person I want to add.

#### Acceptance Criteria

1. WHEN the Current_User types into the Search_Bar, THE Discovery_Popup SHALL filter the user list to show only users whose display name contains the typed text
2. THE Search_Bar SHALL perform case-insensitive matching on user display names
3. WHEN the Search_Bar is cleared, THE Discovery_Popup SHALL display the full list of registered users
4. WHEN no users match the search query, THE Discovery_Popup SHALL display an empty state message indicating no users were found

### Requirement 5: Users API Backend Endpoint

**User Story:** As a frontend developer, I want a backend endpoint that returns all registered users with optional name filtering so that the Discovery_Popup can load user data.

#### Acceptance Criteria

1. THE Users_API SHALL expose a GET /users endpoint that returns a list of registered user profiles from the UserProfiles DynamoDB table
2. THE Users_API SHALL require a valid Cognito authorization token in the request header
3. WHEN an optional "name" query parameter is provided, THE Users_API SHALL return only users whose display name contains the query string (case-insensitive)
4. THE Users_API SHALL return each user's userId and displayName fields in the response
5. THE Users_API SHALL exclude the requesting user's own profile from the results
6. IF the authorization token is missing or invalid, THEN THE Users_API SHALL return a 401 Unauthorized response

### Requirement 6: Remove Group Chat from Navigation

**User Story:** As a product owner, I want to remove the Group Chat entry from the navigation sidebar so that the sidebar only contains actively used features.

#### Acceptance Criteria

1. THE Navigation_Sidebar SHALL display the following items in order: Dashboard, Timetable, Notes, AI Planner, Friends, Profile, Settings
2. THE Navigation_Sidebar SHALL NOT display a "Group Chat" entry
3. THE Navigation_Sidebar SHALL NOT register a route for the /group-chat path

### Requirement 7: Discovery Popup Accessibility and Animation

**User Story:** As a student, I want the discovery popup to feel smooth and responsive so that the interaction is pleasant and accessible.

#### Acceptance Criteria

1. WHEN the Discovery_Popup opens, THE Discovery_Popup SHALL animate in with a fade and scale transition using framer-motion
2. WHEN the Discovery_Popup closes, THE Discovery_Popup SHALL animate out with a fade and scale transition
3. THE Discovery_Popup SHALL be keyboard-accessible, allowing closure via the Escape key
4. THE Search_Bar SHALL receive focus automatically when the Discovery_Popup opens
