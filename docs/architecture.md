## 1. Core Architectural Rules
* **Code Style:** Prefer functional programming patterns, immutability, and explicit type definitions over implicit ones.
* **File Structure:** Maintain strict separation of concerns. Follow the established directory layout:
  * `/components` -> Pure UI components only (no direct data fetching).
  * `/hooks` -> Reusable custom hooks handling state and logic.
  * `/app` -> Next.js routing, pages, and Server Actions.
* **State Management:** Use server state and URL params wherever possible. Avoid global client-side state unless strictly necessary.

## 2. General idea of how the calculation shall work
 Every module is deterministic
 The module name is the function that performs
 The function part of the library has to be a simple word
 The functions can be executed after compiled with a simple invocation or the code could be reused by been imported by any external module following GOLANG standards.
 The number of arguments depend in the data needed to perform the calculation
 The standard output is json showing the arguments containing the input data and the result of the calculation.
 An -L flag shall be supported that causes a `Legacy` output that instead of json is a text  simple and human readable output