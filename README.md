# super-duper-pancake
Time's Up Web Edition

A shared-screen party card game built with Angular 22, standalone components,
lazy-loaded routing, Signals, Angular Material, TypeScript, and SCSS.

## Run locally

Requires Node.js 22.22.3+ or a supported newer LTS release and npm.

```sh
cd web
npm ci
npm start
```

Open `http://localhost:4200`. For production, run `npm run build` in `web`;
deploy `web/dist/party-cards/browser` on a static host configured to serve
`index.html` for client-side routes.

## Validate

From `web`:

```sh
npm test -- --watch=false
npm run build
npx prettier --check "src/**/*.{ts,html,scss}"
```

There is no separate ESLint configuration. Tests use the Angular CLI's Vitest
runner.

## Project structure

```text
web/
  public/                        Static assets
  src/
    app/
      app.config.ts              Application providers
      app.routes.ts              Lazy-loaded routes and phase guards
      core/
        models/game.models.ts    Player, Team, CharacterCard, Deck, Round,
                                 Turn, and GameState interfaces
        services/
          game.service.ts        Authoritative game transitions and scores
          timer.service.ts       Absolute-deadline countdown
          turn-sound.service.ts  End-of-turn audio alert
          storage.service.ts     Safe localStorage access
          deck.service.ts        Built-in and custom decks, JSON validation
      pages/
        home/
        team-setup/
        deck-selection/
        deck-management/
        gameplay/
        round-summary/
        final-results/
        rules/
      shared/scoreboard/         Reusable accessible score table
    styles.scss                  Material theme and responsive layouts
```

## Playing and persistence

Add at least four players, create balanced teams, and choose a deck with at
least 50 characters. Exactly 50 cards are selected and reused in all three
rounds. Teams alternate turns and rotate clue givers. Each correct answer
awards one point. Unsolved cards return; passing is disabled in round one.
Clue restrictions are enforced by players, not speech recognition.

During a turn, use the Correct and Pass buttons, or swipe the card right for
correct and left to pass on a touchscreen. Passing remains disabled in round
one. The timer continues if you open the rules or leave the page.
When time runs out, three short beeps play and a visual alert appears until
dismissed or the next turn starts. The alert also appears if a turn expired
while the page was closed, and respects reduced-motion settings. Sound depends
on the device volume and browser audio permissions; after refreshing an active
turn, tap Enable sound to allow the alarm. Browsers may suspend audio or timers
while the page is in the background.

Progress and custom decks are saved in this browser's localStorage when
available. Refreshing does not restart an active 60-second deadline.
Blocked storage or exhausted quota falls back to in-memory play; progress
then cannot be guaranteed across refreshes. Clearing browser data removes
saved games and custom decks. No credentials or personal accounts are used.

Custom decks can be edited, deleted, and imported/exported as JSON:

```json
{
  "id": "my-deck",
  "name": "Game night",
  "cards": [
    { "id": "character-1", "name": "Sherlock Holmes" }
  ]
}
```

Small decks can be saved while being edited, but cannot be played until they
contain 50 characters. Importing creates a custom copy; the built-in deck is
protected. Downloads contain deck data, not game progress.
Custom collections are limited to 50 decks, 1,000 cards per deck, and
2,000,000 serialized characters in total. Oversized saves are rejected
without changing the existing collection.

## Future multiplayer support

Components read signal state and invoke GameService commands rather than
mutating game records. Stable player, team, card, and turn IDs and explicit
turn deadlines provide a boundary for a future authoritative server and
transport adapter. This release is local shared-screen play only; online
multiplayer would require server-side command validation, authenticated
sessions, synchronization, and an authoritative clock.
