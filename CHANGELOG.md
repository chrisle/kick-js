# @retconned/kickjs

## 0.8.0

### Minor Changes

- feat: add `onTokenRefresh` callback option to ClientOptions
  - Allows custom handling of OAuth token refresh events
  - Receives new token object: `{ access_token, refresh_token?, expires_in, token_type }`
  - Falls back to legacy `updateEnvTokens` behavior when not provided
  - Supports both sync and async callbacks with error handling

- feat: add automatic 401 error handling with token refresh retry
  - All public API methods now automatically detect 401/unauthorized errors
  - Automatically refreshes OAuth tokens using refresh token when 401 occurs
  - Retries the original API call with the new token
  - Comprehensive error handling for refresh failures and missing credentials
  - Enhanced disconnect method with proper WebSocket state checking

- feat: improve token refresh reliability and user experience
  - Enhanced `removeAllListeners()` to properly clear all event listeners
  - Added comprehensive test coverage for disconnect functionality
  - Added extensive test coverage for 401 retry scenarios and token refresh callbacks
  - Fixed token refresh logic to handle edge cases and provide better error messages

## 0.7.0

### Minor Changes

- feat: add featured livestreams API with language and sorting support
  - Added `getFeaturedLivestreams()` function to fetch featured live channels
  - Support for multiple language codes (e.g., 'en', 'sq,ar')
  - Support for sorting: 'viewers_high_to_low', 'viewers_low_to_high', 'recommended'
  - Added `KickFeaturedLivestreams` and `FeaturedLivestream` types
  - Added WebSocket integration test that connects to real live channels
  - Integration test validates real-time chat message reception

## 0.6.0

### Minor Changes

- feat: add multi-auth support, OAuth implementation, and comprehensive test suite
  - Added automatic OAuth token refresh functionality
  - Added support for all 7 OAuth scopes (user:read, channel:read, channel:write, chat:write, streamkey:read, events:subscribe, moderation:ban)
  - Added comprehensive public API methods (categories, channels, events, livestreams, users, moderation)
  - Added cross-channel messaging support
  - Added comprehensive chatbot example with OAuth authentication
  - Updated README with detailed Quick Start guide and feature list
  - Added 147+ tests with comprehensive coverage

## 0.5.4

### Patch Changes

- 0741467: updates ws url version

## 0.5.3

### Patch Changes

- fda33e9: adds xsrf to sendMessage headers

## 0.5.2

### Patch Changes

- f0de3f0: fixes sendMessages and viewport issues

## 0.5.1

### Patch Changes

- ac3e959: fixes readme

## 0.5.0

### Minor Changes

- 3d46ec4: adds token auth, fixes sending messages

## 0.4.5

### Patch Changes

- 7ce0119: improves auth error handling

## 0.4.4

### Patch Changes

- 26bed3d: fixes div timeout

## 0.4.3

### Patch Changes

- cea93c2: adds polls, leaderboard, timeouts support, cloudflare error handling

## 0.4.2

### Patch Changes

- 6e9408c: fixes example code in readme

## 0.4.1

### Patch Changes

- 2c07d86: minor publishing misshap

## 0.4.0

### Minor Changes

- 59e5f76: authentication implementation

## 0.3.0

### Minor Changes

- d96ca4b: adds a vods data feature

## 0.2.0

### Minor Changes

- b59672c: missing type fix & updated readme

## 0.1.2

### Patch Changes

- 9106a7d: basic functionality implemented

## 0.1.1

### Patch Changes

- 66750c2: Initial release
