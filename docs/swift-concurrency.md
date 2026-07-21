# Swift Concurrency

## Swift Concurrency

### [Beginner] What is async/await?
**Interview answer:**  
`async/await` lets asynchronous code read like synchronous code. An `async` function can suspend, and `await` marks a possible suspension point.

**Deep explanation:**  
Before async/await, asynchronous workflows used nested completion handlers. That made error handling, cancellation, ordering, and readability harder. Async/await gives the compiler a structured model of suspension.

**Why it matters:**  
iOS apps constantly fetch data, read files, request permissions, and update UI. Async/await makes these flows clearer and safer.

**How it works:**  
When code reaches `await`, the current task may suspend and free the underlying thread for other work. The task later resumes, not necessarily on the same thread unless actor isolation requires it.

**Use cases:**  
Networking, image loading, database access, file I/O, permissions, and sequential async workflows.

**Common mistakes:**  
Thinking `await` blocks a thread. Calling async code from sync code by blocking. Forgetting `try` with throwing async functions.

**Best practices:**  
Design async APIs from the top down. Keep UI mutations on `@MainActor`. Propagate cancellation where possible.

**Red flag answers:**  
"Async/await creates a new thread." It creates suspension points in tasks; threads are runtime implementation details.

**Code example:**  
```swift
func loadUser(id: User.ID) async throws -> User {
    let url = URL(string: "https://example.com/users/\(id)")!
    let (data, _) = try await URLSession.shared.data(from: url)
    return try JSONDecoder().decode(User.self, from: data)
}
```

**Possible follow-up questions:**  
What is a suspension point? Can sync code call async code directly?

### [Intermediate] What is a Task?
**Interview answer:**  
A `Task` is a unit of asynchronous work managed by Swift concurrency. It has priority, cancellation state, and can return a value or throw.

**Deep explanation:**  
Tasks run async code. Structured child tasks are tied to a parent scope. Unstructured tasks created with `Task {}` are not automatically scoped to a parent function's lifetime, though they inherit some context such as priority and actor context.

**Why it matters:**  
Tasks are how async work is launched from synchronous contexts such as button taps, view lifecycle hooks, and delegate methods.

**How it works:**  
The concurrency runtime schedules tasks on executors. A task progresses until it suspends, completes, throws, or is cancelled. Cancellation is cooperative.

**Use cases:**  
Launching async work from SwiftUI actions, storing a cancellable search task, bridging UIKit callbacks to async code, and background refresh operations.

**Common mistakes:**  
Creating unstructured tasks everywhere. Not storing tasks that need cancellation. Assuming cancellation automatically stops work.

**Best practices:**  
Prefer structured concurrency. Store and cancel unstructured tasks when they are tied to object lifecycle.

**Red flag answers:**  
"Task is the same as Thread." A task is a logical unit of async work, not a dedicated OS thread.

**Code example:**  
```swift
@MainActor
final class SearchViewModel: ObservableObject {
    @Published private(set) var results: [ResultItem] = []
    private var searchTask: Task<Void, Never>?

    func search(_ query: String) {
        searchTask?.cancel()
        searchTask = Task {
            do {
                results = try await SearchService().search(query)
            } catch is CancellationError {
                // Expected when a newer search starts.
            } catch {
                results = []
            }
        }
    }
}
```

**Possible follow-up questions:**  
What context does `Task {}` inherit? How is `Task.detached` different?

### [Senior] What is structured concurrency?
**Interview answer:**  
Structured concurrency means child tasks are scoped to a parent operation, so lifetimes, cancellation, priority, and errors flow predictably through the task tree.

**Deep explanation:**  
Instead of launching orphaned work, structured concurrency makes async work follow lexical structure. If a parent task is cancelled, children are cancelled. If a child throws in a throwing task group, the error can cancel the group.

**Why it matters:**  
It prevents runaway work, lost errors, and lifecycle leaks. It makes async code easier to reason about in apps where screens appear/disappear frequently.

**How it works:**  
`async let` creates fixed child tasks. `withTaskGroup` and `withThrowingTaskGroup` create dynamic child tasks. The scope cannot finish until child tasks finish or are cancelled.

**Use cases:**  
Fetching profile, posts, and settings in parallel; image preloading; batch uploads; fan-out/fan-in work.

**Common mistakes:**  
Using `Task {}` inside an async function instead of `async let` or a task group. Ignoring task group cancellation and partial results.

**Best practices:**  
Use `async let` for a known small number of concurrent operations. Use task groups for dynamic collections. Keep child work independent.

**Red flag answers:**  
"Structured concurrency just means async/await syntax." It specifically refers to scoped child-task lifetimes.

**Code example:**  
```swift
func loadDashboard() async throws -> Dashboard {
    async let profile = profileService.profile()
    async let messages = messageService.unreadMessages()
    async let settings = settingsService.settings()

    return try await Dashboard(
        profile: profile,
        messages: messages,
        settings: settings
    )
}
```

**Possible follow-up questions:**  
When would you use a task group instead of `async let`? How do errors propagate?

### [Senior] What is a TaskGroup?
**Interview answer:**  
A task group creates a dynamic set of child tasks and lets you collect their results as they complete.

**Deep explanation:**  
Task groups are useful when the number of tasks depends on runtime data. They preserve structured concurrency: the group scope waits for children and controls cancellation/error propagation.

**Why it matters:**  
Many app operations fan out over collections: loading thumbnails, validating items, uploading attachments, or fetching pages.

**How it works:**  
Inside `withTaskGroup`, you call `group.addTask`. Results are retrieved by iterating the group. With throwing groups, a thrown error can cancel remaining work depending on how you consume results.

**Use cases:**  
Parallel image loading, batch network requests, prefetching, indexing, and local file processing.

**Common mistakes:**  
Mutating shared state from child tasks. Adding too many tasks without backpressure. Ignoring cancellation.

**Best practices:**  
Return values from child tasks and aggregate in the parent. Limit concurrency manually if work is heavy or server-sensitive.

**Red flag answers:**  
"TaskGroup is for background threads." It is for scoped child tasks, not manual thread management.

**Code example:**  
```swift
func loadThumbnails(for urls: [URL]) async -> [UIImage] {
    await withTaskGroup(of: UIImage?.self) { group in
        for url in urls {
            group.addTask {
                try? await ImageService().thumbnail(from: url)
            }
        }

        var images: [UIImage] = []
        for await image in group {
            if let image {
                images.append(image)
            }
        }
        return images
    }
}
```

**Possible follow-up questions:**  
How do you limit concurrency in a task group? What happens if a child task throws?

### [Intermediate] What is `@MainActor`?
**Interview answer:**  
`@MainActor` isolates code to the main actor, which is the correct place for UI state updates. It is stronger than manually dispatching to the main queue because the compiler can enforce isolation.

**Deep explanation:**  
UIKit and SwiftUI UI state must be updated from the main thread/main actor. Annotating a view model or UI-facing method with `@MainActor` expresses that requirement in the type system.

**Why it matters:**  
It prevents race conditions and "Publishing changes from background threads" issues.

**How it works:**  
The main actor is a global actor. Calls from outside its isolation require `await`, allowing the runtime to hop to the main actor executor.

**Use cases:**  
View models, UI state mutation, UIKit adapter methods, observable model updates used by SwiftUI.

**Common mistakes:**  
Wrapping everything in `DispatchQueue.main.async` inside `@MainActor` code. Marking heavy CPU/network work `@MainActor` and blocking UI responsiveness.

**Best practices:**  
Mark UI-facing view models `@MainActor`. Keep heavy work in services or nonisolated functions, then assign results on the main actor.

**Red flag answers:**  
"MainActor always means the code is currently on the main thread." It means code is isolated to the main actor; execution and hopping are managed by the runtime.

**Code example:**  
```swift
@MainActor
final class ProfileViewModel: ObservableObject {
    @Published private(set) var name = ""
    private let repository: UserRepository

    init(repository: UserRepository) {
        self.repository = repository
    }

    func load(id: User.ID) async {
        do {
            name = try await repository.user(id: id).name
        } catch {
            name = "Unavailable"
        }
    }
}
```

**Possible follow-up questions:**  
How is MainActor different from `DispatchQueue.main.async`? Can a MainActor function suspend?

### [Senior] What are actors?
**Interview answer:**  
Actors are reference types that protect their mutable state through actor isolation. Only code isolated to the actor can access its mutable state directly; outside access requires `await`.

**Deep explanation:**  
Actors address shared mutable state in concurrent programs. Instead of manually locking, actor isolation serializes access to actor-isolated state through an executor.

**Why it matters:**  
Race conditions are a major source of subtle bugs. Actors give a language-level way to protect mutable state.

**How it works:**  
An actor has isolated state. Calls from outside may suspend while waiting for access. Actors are reentrant, so after an `await` inside an actor method, other work may run on the actor before the method resumes.

**Use cases:**  
Token stores, caches, counters, upload coordinators, in-memory databases, and shared mutable services.

**Common mistakes:**  
Assuming actors prevent all logical races. Forgetting actor reentrancy. Exposing mutable non-Sendable state across actor boundaries.

**Best practices:**  
Keep actor methods small. Be careful with invariants across `await` points. Return immutable snapshots.

**Red flag answers:**  
"Actors are just classes on the main thread." Actors are reference types with isolated state; they are not inherently main-thread-bound.

**Code example:**  
```swift
actor TokenStore {
    private var token: String?

    func update(_ token: String) {
        self.token = token
    }

    func currentToken() -> String? {
        token
    }
}
```

**Possible follow-up questions:**  
What is actor reentrancy? What is `nonisolated`? Can actors conform to protocols?

### [Senior] What is `Sendable`?
**Interview answer:**  
`Sendable` marks values that can be safely passed across concurrency domains. It helps the compiler prevent data races when tasks and actors exchange data.

**Deep explanation:**  
Value-semantic types whose stored properties are Sendable are usually safe. Mutable reference types are not automatically safe unless immutable, actor-isolated, or internally synchronized.

**Why it matters:**  
Swift's concurrency safety depends on knowing whether data can cross task or actor boundaries without introducing shared mutable state.

**How it works:**  
The compiler checks Sendable conformance in concurrency-sensitive contexts. `@Sendable` closures must capture values safely for concurrent execution.

**Use cases:**  
DTOs crossing actor boundaries, task group results, async service APIs, caches, and concurrency-safe closures.

**Common mistakes:**  
Using `@unchecked Sendable` as a silencer. Capturing non-thread-safe class instances in `@Sendable` closures.

**Best practices:**  
Make data transfer objects structs with Sendable stored properties. Use actors for mutable shared state. Reserve `@unchecked Sendable` for carefully audited synchronization.

**Red flag answers:**  
"Sendable makes a type thread-safe." It indicates safe transfer; thread safety still depends on the type's design.

**Code example:**  
```swift
struct UserDTO: Decodable, Sendable {
    let id: UUID
    let name: String
}

final class LegacyCache: @unchecked Sendable {
    private let lock = NSLock()
    private var storage: [String: Data] = [:]

    func value(for key: String) -> Data? {
        lock.lock()
        defer { lock.unlock() }
        return storage[key]
    }
}
```

**Possible follow-up questions:**  
When is `@unchecked Sendable` justified? Are closures Sendable by default?

### [Intermediate] How does task cancellation work?
**Interview answer:**  
Task cancellation is cooperative. Cancelling a task sets its cancellation state; the task must check cancellation or call APIs that throw `CancellationError`.

**Deep explanation:**  
Cancellation does not kill running code immediately. This avoids unsafe abrupt termination. Well-designed async functions periodically check cancellation and clean up.

**Why it matters:**  
Screens disappear, searches change, users cancel uploads, and SwiftUI tasks are cancelled automatically. Ignoring cancellation wastes battery, network, and CPU.

**How it works:**  
Call `task.cancel()` or cancellation flows from parent to child. Check `Task.isCancelled`, call `try Task.checkCancellation()`, or rely on cancellable APIs such as `Task.sleep`.

**Use cases:**  
Search-as-you-type, image loading in scrolling lists, view-scoped data loading, uploads, and long computations.

**Common mistakes:**  
Assuming cancellation stops synchronous CPU loops. Swallowing `CancellationError` as a real failure. Updating UI after a cancelled result.

**Best practices:**  
Check cancellation after awaited work and inside loops. Treat cancellation as a neutral outcome.

**Red flag answers:**  
"Cancel guarantees the network request stops instantly." It requests cancellation; behavior depends on the API and timing.

**Code example:**  
```swift
func filterLargeDataset(_ items: [Item], query: String) async throws -> [Item] {
    var results: [Item] = []

    for item in items {
        try Task.checkCancellation()
        if item.title.localizedCaseInsensitiveContains(query) {
            results.append(item)
        }
    }

    return results
}
```

**Possible follow-up questions:**  
How does `.task(id:)` use cancellation? How do you avoid showing stale results?

### [Senior] What is a race condition?
**Interview answer:**  
A race condition happens when program correctness depends on unpredictable timing between concurrent operations. A data race is a specific unsafe case where multiple threads/tasks access the same mutable memory concurrently and at least one writes.

**Deep explanation:**  
Not all race conditions are data races. Actors can prevent data races but still allow logical races if state assumptions cross suspension points.

**Why it matters:**  
Race conditions cause flaky tests, inconsistent UI, duplicate requests, stale writes, and hard-to-reproduce crashes.

**How it works:**  
Concurrent operations interleave differently depending on scheduling, network timing, device load, and suspension points.

**Use cases:**  
Search results arriving out of order, double form submission, token refresh, cache updates, and actor methods with invariants across `await`.

**Common mistakes:**  
Using a serial queue or actor and assuming all ordering bugs are solved. Updating UI with stale async results.

**Best practices:**  
Define ordering rules. Use cancellation, request IDs, actors, locks, or serial executors appropriately. Avoid shared mutable state.

**Red flag answers:**  
"Race condition means two threads write at the same time." That describes data races; logical races are broader.

**Code example:**  
```swift
@MainActor
final class SearchModel: ObservableObject {
    @Published private(set) var results: [Item] = []
    private var latestQuery = ""

    func search(_ query: String) {
        latestQuery = query

        Task {
            let response = try? await SearchService().search(query)
            guard query == latestQuery else { return }
            results = response ?? []
        }
    }
}
```

**Possible follow-up questions:**  
How can actor reentrancy cause logical races? How do you test race conditions?

### [Intermediate] How does GCD compare with Swift Concurrency?
**Interview answer:**  
GCD is a lower-level queue-based API. Swift Concurrency is a language-level model with async/await, tasks, actors, structured concurrency, cancellation, priority, and compiler checks.

**Deep explanation:**  
GCD is still useful for some legacy APIs and low-level scheduling. Swift Concurrency gives clearer control flow and safety. You usually should not mix them unnecessarily in new code.

**Why it matters:**  
Modern iOS code should prefer async/await for readability and correctness, while understanding GCD for older codebases.

**How it works:**  
GCD dispatches blocks to queues. Swift Concurrency schedules tasks on executors and uses suspension points instead of explicit callback nesting.

**Use cases:**  
GCD: legacy callback APIs, dispatch sources, low-level synchronization. Swift Concurrency: networking, data loading, view tasks, actor-isolated services.

**Common mistakes:**  
Calling `DispatchQueue.main.async` from `@MainActor` code. Blocking async functions with semaphores. Wrapping every async function in `Task`.

**Best practices:**  
Use Swift Concurrency for new async APIs. Bridge legacy callbacks with continuations carefully.

**Red flag answers:**  
"GCD is obsolete." It remains part of the platform, but it is no longer the preferred high-level app concurrency model.

**Code example:**  
```swift
func legacyImage(for url: URL, completion: @escaping (UIImage?) -> Void) {
    // Old callback API.
}

func image(for url: URL) async -> UIImage? {
    await withCheckedContinuation { continuation in
        legacyImage(for: url) { image in
            continuation.resume(returning: image)
        }
    }
}
```

**Possible follow-up questions:**  
What is a checked continuation? Why are semaphores dangerous with async code?

### [Intermediate] How do you safely update UI from async code?
**Interview answer:**  
Keep UI state isolated to the main actor. Annotate view models or UI methods with `@MainActor`, or use `await MainActor.run` for a small UI update from non-main-actor code.

**Deep explanation:**  
SwiftUI and UIKit expect UI state changes on the main actor. Modern Swift lets you express that as part of your types instead of sprinkling dispatch calls everywhere.

**Why it matters:**  
Wrong-thread UI updates lead to warnings, races, glitches, and crashes.

**How it works:**  
Actor isolation makes cross-actor UI updates require `await`. The runtime hops to the main actor before executing isolated code.

**Use cases:**  
Assigning `@Published` properties, mutating `@Observable` models used by views, updating UIKit views after network calls.

**Common mistakes:**  
Doing heavy decoding or image processing on `@MainActor`. Updating UI after the view disappeared or task was cancelled.

**Best practices:**  
Fetch and process off the main actor where possible; assign final state on the main actor. Make view models `@MainActor`.

**Red flag answers:**  
"Use DispatchQueue.main.async after every await." That is a sign the isolation model is unclear.

**Code example:**  
```swift
func loadAndAssign() async {
    let user = try? await repository.currentUser()

    await MainActor.run {
        self.user = user
    }
}
```

**Possible follow-up questions:**  
When should the whole type be `@MainActor`? What happens after `await` in a main-actor method?

## Additional Code Examples: Concurrency

Here are more practical code examples for concurrency scenarios:

### Task Cancellation Check
```swift
func downloadData() async throws -> Data {
    let url = URL(string: "https://example.com/data")!
    let (data, _) = try await URLSession.shared.data(from: url)
    
    // Always check for cancellation before doing heavy processing
    try Task.checkCancellation() 
    
    let processedData = process(data)
    return processedData
}
```

### Async let for Parallel Execution
```swift
func fetchDashboardData() async throws -> Dashboard {
    // These run in parallel
    async let user = fetchUser()
    async let settings = fetchSettings()
    async let feed = fetchFeed()
    
    // Await all of them together
    return try await Dashboard(user: user, settings: settings, feed: feed)
}
```
