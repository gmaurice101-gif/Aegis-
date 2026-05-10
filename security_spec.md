# Security Specification - RallyFace AI

## Data Invariants
1. A `Person` must have a unique ID that matches the document ID.
2. `createdAt` must be immutable once set by the server.
3. `status` must be one of the predefined enumerations (VIP, Staff, Citizen, Unknown).
4. `confidence` in a `RecognitionEvent` must be between 0 and 100.

## The Dirty Dozen (Attack Payloads)
1. **Malicious ID**: Create a person with a 2MB string as ID to cause resource exhaustion.
2. **Identity Spoofing**: Update another user's `lastSeen` timestamp without permission.
3. **Ghost Field**: Adding `isVerified: true` to a Person document to bypass system checks.
4. **Invalid Enum**: Setting `status` to `GOD_MODE`.
5. **Backdated Entry**: Setting `createdAt` to a time in 1999.
6. **Future Event**: Setting an event `timestamp` to the year 2099.
7. **Negative Confidence**: Setting recognition confidence to -50.
8. **Massive Payload**: Sending a 10MB base64 string in `imageUrl`.
9. **Unauthenticated Write**: Attempting to register a person without being signed in.
10. **Type Mismatch**: Sending `confidence` as a string "99%".
11. **Shadow Update**: Updating `id` field after creation.
12. **PII Leak**: Attempting to read the `people` collection as an unauthenticated guest.

## Test Runner
See `firestore.rules.test.ts` for implementation details.
