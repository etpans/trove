# TestFlight Validation

Run this checklist on a physical iPhone before submitting a build for external review.

1. Confirm `EXPO_PUBLIC_API_BASE_URL` points at the production API for the EAS profile being built.
2. Install the TestFlight build on a device that has no existing Trove session.
3. Register a new account, verify email, then log in.
4. Quit and reopen the app to confirm the secure stored session restores without logging in again.
5. Create a class, create a student, and create a note for that student.
6. Attach one camera capture and one library item to the note.
7. Reopen the note list and confirm attachments appear and open from the card.
8. Wait for or force an expired access token, then refresh data to verify refresh token recovery.
9. Log out and confirm reopening the app returns to the login screen.
10. Repeat the login and attachment flow on cellular data.
