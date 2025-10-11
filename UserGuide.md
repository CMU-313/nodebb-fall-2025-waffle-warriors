
### Test Dependencies
All features and tests require:
- Redis database (configured in `config.json`)
- NodeBB application running
- Test user accounts

# Private Posts Feature User Guide

## Overview

The Private Posts feature allows users to create topics that are only visible to:
- The topic creator (owner)
- Administrators
- Moderators of the category containing the private topic

This feature is useful for sensitive discussions, private feedback, or content that should only be accessible to specific users with elevated permissions.

## How to Use Private Posts

### Creating a Private Topic

1. **Navigate to a Category**: Go to any category where you have permission to create topics.

2. **Click "New Topic"**: Use the "New Topic" button to open the composer.

3. **Enable Private Mode**:
   - Look for the "🔒Make this post visible only to instructors" checkbox
   - Check this box to make your topic private

4. **Fill in Topic Details**:
   - Enter a title for your topic
   - Write your content
   - Add tags if desired

5. **Post the Topic**: Click "Submit" to create your private topic

## User Testing Guide

1. **Create Private Topic:**
   - Log in as a regular user
   - Navigate to any category
   - Click "New Topic"
   - Check the "Private Topic" checkbox
   - Enter title: "Test Private Topic"
   - Enter content: "This is a test private topic"
   - Submit the topic

2. **Verify Owner Access:**
   - The topic should be visible to you (the creator)
   - You should see the lock icon next to the topic title
   - Click on the topic to verify you can read its content

3. **Verify Regular User Access:**
   - Log out and create a different regular user account
   - Navigate to the same category
   - When you click on the private post it should say Acess Denied You seem to have stumbled upon a page that you do not have access to.

4. **Verify Admin Access:**
   - Log in as an administrator
   - Navigate to the same category
   - The admin should be able to read the topic content

## Automated Tests

A comprehensive suite of automated tests has been developed to ensure the private posts feature is robust, secure, and functions as expected. These tests cover a wide range of scenarios, from basic functionality to critical security checks.

**Test File Location:** `./test/private-posts.js`

### Test Coverage

The automated test suite includes thorough checks for the following areas:

1.  **Private Topic Creation:**
    *   Verifies that topics can be successfully created with the `isPrivate` flag set.
    *   Confirms that standard topics are created correctly without the `isPrivate` flag.
    *   Handles various data types and edge cases for the `isPrivate` field to prevent unexpected behavior.

2.  **Access Control:**
    *   **Owner Access:** Ensures the creator of a private topic can always view it.
    *   **Admin & Moderator Access:** Confirms that administrators and moderators have the appropriate access to private topics.
    *   **Unauthorized Access:** Guarantees that regular users and guests are denied access to private topics they do not own.

3.  **Data Isolation & Filtering:**
    *   **Category Listings:** Private topics are correctly filtered out from public category listings for unauthorized users.
    *   **Recent Topics:** Private posts do not appear in the public "Recent" topics list.
    *   **Vote & Post Counts:** Verifies that private topics and their posts are not included in public vote and post count rankings.

4.  **API & Endpoint Security:**
    *   The API endpoints are tested to ensure they strictly enforce the access control rules.
    *   Prevents any potential data leaks through API misuse.

### Running the Tests

To execute the automated tests for the private posts feature, use the following commands:

```bash
# Navigate to your NodeBB installation directory
cd /path/to/nodebbwafflewarriors

# Run the dedicated test file for private posts
npm run test -- test/private-posts.js

# Alternatively, to run the entire test suite
npm test
```

### Sufficiency of Tests

This test suite is considered sufficient because

*   **Complete Access Matrix:** It systematically tests all relevant user roles (owner, admin, moderator, regular user, guest) against all critical permission scenarios.
*   **Integration Across Components:** The tests validate the feature's integration with multiple core components, including topic creation, access control, data filtering, and API endpoints.
*   **Security-First Approach:** A significant portion of the test suite is dedicated to ensuring that the access control mechanisms are functioning correctly and that there are no security vulnerabilities.
*   **Data Integrity:** The tests confirm that private posts are correctly stored in the database and are properly excluded from public data sets and listings.

# Anonymous Posting Feature

What is it?
The anonymous topic feature allows administrators to apply a special “anonymous” tag to a topic, making the entire thread, including all posts, anonymous. When a topic is marked as anonymous, posts display normally, but each user shows a gray “?” icon and a pseudonymous display name such as anon_person_1, anon_person_2, etc. Only administrators have the ability to add or remove the anonymous tag, and tags similar to “anonymous” (e.g., anon, ANON, anonymous-1) are disallowed.

## How to Use and Test
To explore and verify the Anonymous Topic feature, an administrator can begin by creating a new topic and adding the special “anonymous” tag before submission. Once the topic is posted, it should visually reflect its anonymous status: the user icon changes to a gray “?” symbol, the display name appears as anon_person, and the “anonymous” tag is clearly visible on the topic itself. When viewed by non-administrative users, the topic maintains this anonymous presentation. Replies from non-administrators are automatically assigned unique pseudonymous identifiers, such as anon_person_1, anon_person_2, and so on, which persist consistently across all replies by the same user within that topic. If a non-administrator attempts to create a new topic using the “anonymous” tag, they are met with a “You do not have enough privileges for this action” error, and attempts to use disallowed variations, such as anon or anonymous-1, trigger an “error: invalid-tag” message, enforcing strict tag validation and maintaining the integrity of anonymity permissions.

Administrators also have the flexibility to revert a topic to its original, non-anonymous state. By removing the “anonymous” tag and refreshing the page, all posts under the topic immediately display the users’ true icons and display names, while the is_anonymous flag is cleared. This ensures that anonymity can be dynamically toggled while preserving proper permissions and consistent post display. Additionally, administrators can apply the anonymous status to a topic post hoc by using the Topic Tools dropdown, allowing them to tag an existing thread as anonymous without having to recreate it.

Automated Tests
The test/anonymous-topics.js file contains a comprehensive suite of automated tests designed to validate the functionality, permissions, display logic, and state management of the Anonymous Topic feature. The tests first set up controlled conditions, creating an administrator and a regular user, along with a dedicated test category. They are structured into three primary areas. The Permissions & Validation tests confirm that administrators can successfully create anonymous topics while non-administrators are prevented from doing so, and they verify that invalid tag variations, such as anon or anonymous-1, are rejected. The Display Logic tests ensure that posts within anonymous topics correctly show pseudonymous usernames (anon_person, anon_person_1) and maintain unique identities for different users. The State Reversion tests verify that removing the “anonymous” tag restores the original usernames and clears the is_anonymous flag. Each test also includes proper cleanup routines, purging topics and test users to maintain database consistency and prevent residual data from affecting subsequent tests.

It should be noted that while the test suite fully covers backend functionality, certain frontend-only interactions, such as the visual display of the gray “?” icon in the composer, tag dropdown interactions, and real-time UI updates, are not automated and require manual testing to verify their correct behavior.

By covering both the primary functionality and edge cases, this test suite provides strong assurance that the Anonymous Topic feature behaves as expected. It validates adherence to the acceptance criteria, confirms the integrity of anonymous post handling, and ensures that permissions, display behavior, and state transitions are robustly enforced across the system

### Running the Tests

To execute the automated tests for the anonymous posts feature, use the following command:

```bash
# Run the dedicated test file
npm run test -- test/anonymous-topics.js
```

# Polling System User Guide

This guide provides comprehensive instructions for using and testing the native polling system implemented in NodeBB.

## Overview

The polling system allows users to create interactive polls with multiple voting options, track results in real-time, and manage poll lifecycles. The system includes comprehensive security measures, validation, and error handling.

Key capabilities:
- Create polls with multiple options (2-10 options per poll)
- Single choice voting with duplicate prevention
- Anonymous voting options
- Real-time result updates
- Permission-based management (creators can edit/delete their polls)
- Comprehensive API for integration

## Creating Polls

### Step-by-Step Guide

1. **Navigate to Poll Creation**
   - Click the polls navigation icon or go to `/polls`
   - Click "Create Poll" button

2. **Fill Poll Details**
   - **Title**: Required, clear and descriptive poll question
   - **Description**: Optional, additional context
   - **Options**: Add 2-10 voting options using the "+" button
   - **Anonymous Voting**: Check to hide voter identities

3. **Submit the Poll**
   - Click "Create Poll"
   - System validates input and redirects to the poll page

## Viewing and Voting on Polls

### Viewing Poll Results
1. Navigate to `/polls` to see all available polls
2. Click any poll title to view details
3. Results show real-time vote counts and percentages

### Voting Process
1. View a poll at `/polls/{id}`
2. Select one option from the available choices
3. Click "Vote" button
4. System immediately updates results

### Voting Restrictions
- Must be logged in to vote
- Can only vote once per poll
- Cannot change votes after submitting
- Invalid options are rejected

## Managing Polls

### Editing Polls
1. Navigate to your poll at `/polls/{id}`
2. Click "Edit Poll" if you're the creator
3. Modify title, description, or options
4. Save changes

### Deleting Polls
1. Go to your poll's edit page
2. Click "Delete Poll"
3. Confirm deletion (permanent action)
## Testing the System

### Manual Testing Scenarios

#### Basic Poll Lifecycle
1. Create a poll with 3 options
2. Vote as different users
3. Verify results update correctly
4. Edit the poll title
5. Delete the poll

#### Error Conditions
1. Try to create a poll with empty title (should fail)
2. Try to create a poll with 1 option (should fail)
3. Try to vote without logging in (should fail)
4. Try to vote twice on same poll (should fail)

## Automated Testing

### Test Location
All automated tests are located in `test/polls.js` in the project root.

### Test Categories

#### API Tests (11 tests)

#### Frontend Integration Tests (2 tests)

#### Database Operation Tests (9 tests)

### Running Tests

```bash
npm run test -- test/polls.js
```
