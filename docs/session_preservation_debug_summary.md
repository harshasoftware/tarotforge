# TarotForge Session Preservation Debugging

## 1. Main Issue

Session state, particularly `shuffledDeck` (the remaining cards in the deck) and `readingStep` (the current stage of the reading), is not reliably preserved when an anonymous guest user upgrades their account to a registered Google account. This often results in the `shuffledDeck` reverting to the full deck count (e.g., 78 cards) even if cards had been drawn, and the `readingStep` regressing to an earlier stage (e.g., from 'drawing cards' back to 'selecting layout').

## 2. Diagnosis: The Race Condition

The core problem was identified as a race condition between `ReadingRoom.tsx` updating the session state in `readingSessionStore.ts` and `authStore.ts` capturing that state to preserve it during the Google OAuth redirect.

**Sequence of Events Leading to State Loss:**

1.  **Initial State:** `readingSessionStore.ts` initializes with `shuffledDeck` as an empty array (`[]`).
2.  **Deck Loading (`ReadingRoom.tsx`):**
    *   When `ReadingRoom.tsx` mounts or a deck is selected, `initializeSession` (from `readingSessionStore`) is called.
    *   This often triggers `fetchAndSetDeck`.
    *   `fetchAndSetDeck` fetches card data, shuffles them into `newShuffledDeck`, updates its local React state (`setShuffledDeck`), and then asynchronously calls `updateSession({ shuffledDeck: newShuffledDeck })` to update the `readingSessionStore`.
3.  **Upgrade Triggered (`GuestAccountUpgrade.tsx` / `SignInModal.tsx`):**
    *   The guest clicks "Upgrade with Google".
    *   This calls `linkWithGoogle` in `authStore.ts`.
4.  **State Capture (`authStore.ts` - `linkWithGoogle`):**
    *   `linkWithGoogle` immediately reads the current state from `readingSessionStore.getState()` (including `shuffledDeck`, `readingStep`, etc.).
    *   It then serializes this state into `localStorage` under the key `auth_session_context`.
    *   **The Critical Flaw:** Console logs definitively showed that at the moment `linkWithGoogle` read from `readingSessionStore`, the `updateSession` call from `fetchAndSetDeck` had often *not yet completed*. Thus, `readingSessionStore.getState().sessionState.shuffledDeck` was frequently still `[]` or had an incorrect count (e.g., 0).
5.  **Incorrect Preservation:** The `auth_session_context` saved to `localStorage` therefore contained this stale/empty `shuffledDeck` and potentially a regressed `readingStep`.
6.  **Post-OAuth Migration (`AuthCallback.tsx` & `authStore.ts`):**
    *   After the user authenticates with Google and is redirected back, `AuthCallback.tsx` retrieves the `auth_session_context` from `localStorage`.
    *   `authStore.ts`'s `migrateAnonymousUserData` function uses this (incorrect) context to update the `reading_sessions` table in the Supabase database for the newly authenticated user.
7.  **State Regression in UI:**
    *   When `ReadingRoom.tsx` re-initializes for the authenticated user, `readingSessionStore.initializeSession` fetches the session data.
    *   This data now reflects the incorrect state (empty `shuffled_deck`) from the database.
    *   Alternatively, if `preserved_session_state` was used (logic to restore from `auth_session_context` directly in the client), it would also use the stale data. Realtime updates from the database (reflecting the bad migration) could also overwrite any temporarily correct local state.

## 3. Fixes Implemented

The primary fix addresses the race condition by introducing a small delay, allowing `readingSessionStore` to update before its state is captured.

*   **Delay in `authStore.ts`:**
    *   In `src/stores/authStore.ts`, within the `linkWithEmail` and `linkWithGoogle` functions:
    *   Added `await new Promise(resolve => setTimeout(resolve, 200));` (a 200-millisecond delay).
    *   This delay occurs *just before* `readingSessionStore.getState()` is called and its result is saved to `localStorage` (as `auth_session_context`).
    *   **Rationale:** This pause provides a window for any pending asynchronous `updateSession` calls (e.g., from `ReadingRoom.tsx` updating `shuffledDeck`) to complete and reflect their changes in the `readingSessionStore` before `authStore` captures the state for preservation.
    *   Variable declarations within `linkWithGoogle` were also cleaned up to prevent "redeclaration" errors.

## 4. Action Items & Verification

The efficacy of the 200ms delay needs to be confirmed through testing.

1.  **Thoroughly Test Guest-to-Google Upgrade Flow:**
    *   **Scenario:**
        1.  Start as a guest user in `ReadingRoom.tsx`.
        2.  Allow a deck to load fully.
        3.  Perform actions: Select a reading layout, draw several cards (e.g., 3-5 cards). Note the number of cards remaining in the deck and the current `readingStep`.
        4.  Initiate the "Upgrade with Google" process (e.g., via the `GuestAccountUpgrade` modal or `SignInModal`).
        5.  Complete the Google authentication.
    *   **Verification (after returning to `ReadingRoom.tsx` as the authenticated user):**
        *   **`shuffledDeck`:** Is the number of cards correct (i.e., reflecting the cards drawn as a guest)?
        *   **`readingStep`:** Is the `readingStep` correctly preserved (e.g., still 'drawing' if that was the last step, or 'interpretation' if it was reached)?
        *   **`selectedCards`:** Are the cards drawn as a guest still present and in their correct positions?
        *   **`selectedLayout`:** Is the chosen layout still active?

2.  **Monitor Key Console Logs:**
    *   **Before Redirect (in `authStore.ts` - `linkWithGoogle`):**
        *   `🔗🚀 authStore.linkWithGoogle CALLED` -> Check `readingSessionStore state: shuffledDeck: X readingStep: Y`. (This shows state *before* the 200ms delay).
        *   `💾🔍 authStore.linkWithGoogle: Pre-localStorage save: shuffledDeck length: X` (This shows state *after* the 200ms delay, just before saving to `localStorage`. **This `X` should be the correct, reduced deck count.**).
    *   **After Redirect & During Migration (in `authStore.ts` - `migrateAnonymousUserData`):**
        *   `📦 Deep dive into payload for reading_sessions update` -> Examine the `shuffled_deck` array in this payload. **It should now contain the correct card objects and length.**
    *   **Session Initialization (in `readingSessionStore.ts` - `initializeSession`):**
        *   Look for logs related to applying `preserved_session_state` (if `migrationComplete` was true and `auth_session_context` was used).
        *   Observe what `shuffledDeck`, `readingStep`, etc., are being set from (database vs. preserved local state).

3.  **Realtime Behavior:**
    *   After migration and local state restoration, ensure that incoming realtime updates for the `reading_sessions` table do not immediately overwrite the correctly restored local state with stale data from the database (if the database update itself was somehow delayed or still incorrect initially). The `_justRestoredFromPreservedState` flag in `readingSessionStore.ts` was intended to help with this; verify its effectiveness if issues persist.

## 5. Outstanding Issues

*   **Linter Error in `ReadingRoom.tsx`:**
    *   A type error persists on line 3322 related to `ParticipantsDropdown` props:
      `Type '{ id: string; name: string | undefined; userId: string | null; anonymousId: string | null; isHost: boolean | "" | null; }[]' is not assignable to type 'Participant[]'.`
    *   This error was inadvertently introduced by an automated edit and needs to be corrected by ensuring the `isHost` property mapping provides a `boolean | undefined` type. The original mapping was likely:
      `isHost: hostStatus === null ? undefined : !!hostStatus`

## 6. Future Considerations (If Delay Isn't Robust)

If the 200ms delay proves insufficient or unreliable long-term:
*   **Revisit `await`ing `updateSession` in `ReadingRoom.tsx`:** The difficulties with the `edit_file` tool would need to be overcome to properly make `fetchAndSetDeck` and other relevant functions fully `async` and `await` their calls to `updateSession`. This is the more structurally sound solution.
*   **State Synchronization Primitive:** Implement a more explicit signaling mechanism or a brief "locking" period where `authStore` waits for a confirmation from `readingSessionStore` that critical updates are complete before proceeding with state capture. 
*  **The most robust solution is to ensure that readingSessionStore is the single source of truth and that operations like initializing the deck, shuffling, and drawing cards are atomic actions within the store that update its state directly and then persist.

## 7. Test Scenarios for Host Transfer Verification

This section focuses on verifying that host status is correctly transferred from an anonymous user to their newly authenticated account during the upgrade process. The key is to ensure the `is_host` flag in `session_participants` and the `host_user_id` in `reading_sessions` are correct, and that the client-side `readingSessionStore.isHost` reflects this.

**Pre-requisites for all tests:**
*   Clear browser cache/storage or use a fresh incognito window for each test to simulate a new anonymous user.
*   Have developer tools open to monitor console logs and Supabase network requests (especially updates to `session_participants` and `reading_sessions`).
*   Be ready to inspect the `session_participants` and `reading_sessions` tables in your Supabase dashboard.

---

**Test Scenario 7.1: Simple Guest Host Upgrade (No Other Participants)**

*   **Objective:** Verify basic host transfer in a solo session.
*   **Steps:**
    1.  **Start as Guest:** Open `ReadingRoom.tsx`. A new session should be created with you as the anonymous host.
        *   _Verification:_ `readingSessionStore.isHost` should be `true`. Your anonymous participant in `session_participants` should have `is_host: true`. The `reading_sessions` table's `host_user_id` should be your anonymous ID.
    2.  **Perform Actions:** Select a layout, draw a card.
    3.  **Upgrade Account:** Use the "Upgrade with Google" (or email) option. Complete the authentication.
    4.  **Return to Session:** You should be redirected back to the `ReadingRoom.tsx`.
*   **Expected Outcome (Post-Upgrade):**
    *   **Client-Side:**
        *   `readingSessionStore.isHost` is `true`.
        *   You see host-specific UI controls (if any).
        *   Your displayed name is updated from "Guest..." to your authenticated username/full name.
    *   **Database (`reading_sessions` table):**
        *   The `host_user_id` for the session is updated to your new authenticated user ID.
        *   The `original_host_user_id` (if you implemented this field) should contain your previous anonymous ID.
    *   **Database (`session_participants` table):**
        *   Your original anonymous participant record should now have:
            *   `user_id` set to your new authenticated user ID.
            *   `anonymous_id` set to `null`.
            *   `is_host` should still be `true`.
            *   `name` should be updated to your authenticated name.
        *   There should be no other active participant record for your authenticated user ID in this session.
    *   **Session State:** `shuffledDeck`, `selectedCards`, `readingStep` should be correctly preserved from before the upgrade.

---

**Test Scenario 7.2: Guest Host Upgrades with Other Participants Present**

*   **Objective:** Verify host transfer when other participants (guests or authenticated users) are in the session.
*   **Steps:**
    1.  **Participant A (Guest Host):** In browser/incognito window 1, open `ReadingRoom.tsx`. Session A created. Participant A is anonymous host.
    2.  **Participant B (Guest or Authenticated):** In browser/incognito window 2, join Session A using the share link.
        *   _Verification:_ Participant A is host. Participant B is not.
    3.  **Host Upgrades:** Participant A (the anonymous host) upgrades their account to Google/Email.
    4.  **Return to Session:** Participant A is redirected back.
*   **Expected Outcome (Post-Upgrade for Participant A):**
    *   Same as Test Scenario 7.1 for Participant A (they should remain host).
    *   **Participant B's View:** Participant B should still see Participant A as the host (now with their authenticated name). The session should continue seamlessly for Participant B.

---

**Test Scenario 7.3: Authenticated User was Already a Non-Host Participant, then Anonymous Host Tries to Upgrade into that Account**

*   **Objective:** This tests the edge case where the Google/Email account being linked to *was already a non-host participant* in the *same session* (e.g., joined on another device, then host passed to someone else, now trying to reclaim original session as host via anonymous upgrade). This is the scenario the current deactivation logic (`lines 920-933 in authStore.ts`) might handle suboptimally if not careful.
*   **Steps:**
    1.  **User X (Authenticated):** In browser 1, log in as User X.
    2.  **User Y (Anonymous Guest):** In browser 2 (incognito), start a new reading session. User Y is the anonymous host.
    3.  **User X Joins Y's Session:** User X (authenticated) joins User Y's session as a non-host participant using a share link.
        *   _Verification:_ User Y is host (`is_host: true` in `session_participants`). User X is participant (`is_host: false`).
    4.  **User Y Upgrades to User X's Account:** User Y (the anonymous host) now clicks "Upgrade Account" and chooses to sign in/link with User X's Google/Email account.
*   **Expected Outcome (Post-Upgrade):**
    *   **Critical:** User X should now be the definitive host of the session.
    *   **Client-Side (Browser 2, originally User Y, now User X):**
        *   `readingSessionStore.isHost` should be `true`.
    *   **Database (`session_participants` table):**
        *   The original participant record for User Y (anonymousId) should be updated:
            *   `user_id` becomes User X's ID.
            *   `anonymous_id` becomes `null`.
            *   **`is_host` must be `true`** (carried over from User Y's host status).
        *   The original participant record for User X (when they joined as a non-host) should ideally be marked as `is_active: false` to avoid duplicates, OR the migration logic should have intelligently merged/prioritized the host record. *This is where the current logic might just deactivate User Y's record if User X's non-host record already exists.*
    *   **Database (`reading_sessions` table):**
        *   `host_user_id` is User X's ID.
    *   **Client-Side (Browser 1, User X who was already there):** Their view should update to reflect that the participant who was "User Y" is now also "User X" and is the host. This might involve a participant list refresh.

---

**Test Scenario 7.4: Non-Host Guest Upgrades**

*   **Objective:** Ensure upgrading a non-host guest doesn't incorrectly make them a host.
*   **Steps:**
    1.  **Participant A (Authenticated Host):** In browser 1, log in. Create a session. Participant A is host.
    2.  **Participant B (Guest):** In browser 2 (incognito), join Session A. Participant B is anonymous non-host.
        *   _Verification:_ Participant A is host. Participant B is not (`is_host: false` for their anonymous participant record).
    3.  **Guest Upgrades:** Participant B upgrades their account.
*   **Expected Outcome (Post-Upgrade for Participant B):**
    *   Participant B is successfully authenticated.
    *   **Client-Side (Participant B):** `readingSessionStore.isHost` is `false`.
    *   **Database (`session_participants` table):** Participant B's record is updated (user_id set, anonymous_id null), and `is_host` remains `false`.
    *   Participant A remains the host.

---

**Key Things to Monitor During Testing:**

*   **Console Logs:** Pay close attention to logs from `migrateAnonymousUserData` regarding participant updates, especially any messages about deactivating participants or updating `is_host`.
*   **Supabase Dashboard:**
    *   Before and after upgrade, inspect the `session_participants` table for the session ID. Check `user_id`, `anonymous_id`, `is_host`, and `is_active` flags for all participants.
    *   Inspect the `reading_sessions` table for `host_user_id` and `original_host_user_id`.
*   **UI Behavior:** Ensure UI controls and displayed information correctly reflect the host status for all users involved.

By running through these scenarios, we can gain confidence that the host transfer mechanism is robust.