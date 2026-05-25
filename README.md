<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/219a28d7-7815-4f4a-940e-cd1a89291e52

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Configure Firebase Admin in `.env.local` using the same backend credentials as the existing `show-plan` project:
   - `FIREBASE_SERVICE_ACCOUNT_JSON`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_STORAGE_BUCKET`
4. Optional: switch the public exhibition read path to the event backend while keeping `/admin` submission on Firebase:
   - `VITE_WORKS_SOURCE=event`
   - `VITE_EVENT_API_BASE=https://show-plan-event-backend.liucheng-show-plan.workers.dev`
   - Leave `VITE_WORKS_SOURCE` unset or set to `firebase` to keep the current behavior.
5. Run the app:
   `npm run dev:full`

## API backend

The app now exposes these API routes and stores data in Firebase:

- `GET /api/works`
- `GET /api/submissions`
- `POST /api/submissions`
- `DELETE /api/submissions/:id`

Firestore stores submission metadata in `designerSubmissions` by default. Cover images are uploaded to Firebase Storage under `designer-submissions/`.

## Public works compatibility

The public exhibition scene can read works from two sources:

- Default: existing same-origin `GET /api/works`, backed by Firebase in this repo.
- Event backend: set `VITE_WORKS_SOURCE=event` to fetch `GET /api/works` from `VITE_EVENT_API_BASE`.

When `VITE_WORKS_SOURCE=event`, the frontend adapts the event backend payload:

```json
{
  "works": [
    {
      "id": "uuid",
      "studentId": "uuid",
      "studentName": "张三",
      "workIndex": 1,
      "workUrl": "https://example.com/work/1",
      "coverUrl": "https://example.com/covers/1.jpg",
      "createdAt": "2026-05-25T02:00:00.000Z"
    }
  ]
}
```

into the current `ExhibitionWork` shape used by `CosmosScene`, without changing the `/admin` submission flow.
