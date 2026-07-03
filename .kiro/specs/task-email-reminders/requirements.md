# Requirements Document

## Introduction

This feature adds email reminder notifications for tasks that are due the following day. It replaces the existing Workato webhook approach with an AWS-native solution using Amazon SES. The frontend triggers a notification Lambda when a user creates or updates a task with tomorrow's due date. The Lambda looks up the user's email from the UserProfiles DynamoDB table and sends a reminder email via SES. Existing in-app toast notifications remain unchanged.

## Glossary

- **Notification_Lambda**: The AWS Lambda function that handles the `POST /tasks/notify` endpoint, responsible for looking up the user's email and sending the reminder via SES.
- **UserProfiles_Table**: The DynamoDB table storing registered user profiles, keyed by `userId`, containing the user's email address.
- **SES_Service**: Amazon Simple Email Service, used to send outbound reminder emails from the verified sender address `noreply@synccircle.com`.
- **Frontend_App**: The React + Vite web application that the user interacts with to create and manage tasks.
- **API_Gateway**: The AWS API Gateway REST API that routes authenticated requests to Lambda functions.
- **Task**: A user-created item with a title, optional description, and a due date, currently stored in the browser's localStorage.
- **Due_Date**: The calendar date by which a task should be completed.
- **Cognito_Authorizer**: The AWS Cognito JWT-based authorizer that validates user identity on API requests.

## Requirements

### Requirement 1: Trigger Email Notification on Task Save

**User Story:** As a student, I want to receive an email reminder when I save a task that is due tomorrow, so that I am reminded about upcoming deadlines without relying on the app being open.

#### Acceptance Criteria

1. WHEN a user creates or updates a task with a due date equal to the next calendar day, THE Frontend_App SHALL send an authenticated POST request to the `/tasks/notify` endpoint with the task title and due date.
2. WHEN a task is saved with a due date that is not tomorrow, THE Frontend_App SHALL not send a notification request to the `/tasks/notify` endpoint.
3. THE Frontend_App SHALL determine "tomorrow" based on the user's local timezone at the time of saving.

### Requirement 2: API Endpoint for Task Notification

**User Story:** As the system, I want a dedicated API endpoint that accepts notification requests, so that the backend can process email reminders independently of task storage.

#### Acceptance Criteria

1. THE API_Gateway SHALL expose a `POST /tasks/notify` route protected by the Cognito_Authorizer.
2. WHEN the `/tasks/notify` endpoint receives a request, THE API_Gateway SHALL validate that the request body contains a non-empty `taskTitle` string and a valid `dueDate` string in ISO 8601 date format (YYYY-MM-DD).
3. IF the request body is missing required fields or contains invalid data, THEN THE API_Gateway SHALL return a 400 status code with a descriptive error message.
4. IF the request lacks a valid Cognito authorization token, THEN THE API_Gateway SHALL return a 401 status code.

### Requirement 3: User Email Lookup

**User Story:** As the system, I want to retrieve the user's registered email from DynamoDB, so that reminders are sent to the correct address.

#### Acceptance Criteria

1. WHEN the Notification_Lambda receives a valid notification request, THE Notification_Lambda SHALL extract the authenticated user's `userId` from the Cognito JWT claims.
2. WHEN the Notification_Lambda has the userId, THE Notification_Lambda SHALL query the UserProfiles_Table to retrieve the user's email address.
3. IF the user profile does not exist in the UserProfiles_Table, THEN THE Notification_Lambda SHALL return a 404 status code with the error message "User profile not found".

### Requirement 4: Send Reminder Email via SES

**User Story:** As a student, I want to receive a clearly formatted email reminding me of my upcoming task, so that I can take action before the deadline.

#### Acceptance Criteria

1. WHEN the Notification_Lambda has retrieved the user's email, THE Notification_Lambda SHALL send an email via SES_Service from `noreply@synccircle.com` to the user's registered email address.
2. THE Notification_Lambda SHALL include the task title and formatted due date in the email subject line.
3. THE Notification_Lambda SHALL include a friendly reminder message in the email body containing the task title and the due date.
4. WHEN the email is sent successfully, THE Notification_Lambda SHALL return a 200 status code with a confirmation message.
5. IF the SES_Service returns an error, THEN THE Notification_Lambda SHALL return a 500 status code with the error message "Failed to send reminder email".

### Requirement 5: SES Configuration for Real Email Delivery

**User Story:** As the operations team, I want SES configured to send real emails to verified addresses, so that the reminder feature works end-to-end during the hackathon demo.

#### Acceptance Criteria

1. THE SES_Service SHALL have the sender identity `noreply@synccircle.com` verified in the deployed AWS account.
2. WHILE SES_Service is in sandbox mode, THE Notification_Lambda SHALL only send emails to verified recipient email addresses.
3. THE Lambda_Construct SHALL set the `EMAIL_ADAPTER` environment variable to an empty string for the Notification_Lambda to enable real SES sending.

### Requirement 6: Preserve Existing In-App Notifications

**User Story:** As a student, I want to keep receiving in-app toast notifications for task deadlines, so that I have multiple reminders through different channels.

#### Acceptance Criteria

1. THE Frontend_App SHALL continue to display in-app toast notifications for task deadlines using the existing `useTaskNotifications` hook.
2. WHEN a task due tomorrow triggers an email notification request, THE Frontend_App SHALL also display the existing in-app toast notification independently of the email request outcome.
3. IF the email notification request fails, THEN THE Frontend_App SHALL not display an error to the user and SHALL continue operating with in-app notifications only.

### Requirement 7: CDK Infrastructure for Notification Lambda

**User Story:** As a developer, I want the notification Lambda and its permissions defined in CDK, so that the infrastructure is reproducible and follows the existing patterns.

#### Acceptance Criteria

1. THE Lambda_Construct SHALL define a new `notifyTaskHandler` Lambda function using Node.js 20 runtime with esbuild bundling.
2. THE Lambda_Construct SHALL grant the `notifyTaskHandler` read access (`dynamodb:GetItem`) to the UserProfiles_Table.
3. THE Lambda_Construct SHALL grant the `notifyTaskHandler` permission to call `ses:SendEmail` restricted to the sender address `noreply@synccircle.com`.
4. THE API_Gateway SHALL wire the `POST /tasks/notify` route to the `notifyTaskHandler` with Cognito authorization.
