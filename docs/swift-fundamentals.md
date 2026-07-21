# Swift Fundamentals

## Swift Fundamentals

### [Beginner] What is the difference between a struct and a class in Swift?
**Interview answer:**  
A `struct` is a value type: assigning or passing it creates an independent value. A `class` is a reference type: assigning or passing it shares the same instance. Classes support inheritance, identity checks with `===`, deinitializers, and ARC-based reference counting; structs do not.

**Deep explanation:**  
Structs and classes can both store properties, define methods, conform to protocols, define initializers, and be extended. The major difference is semantics. A struct models a value, like `Date`, `URL`, `CGRect`, or a domain model. A class models identity and shared mutable lifetime, like a view controller, service object, cache, or object graph node.

**Why it matters:**  
This choice determines how state moves through your app. Value types make local reasoning easier because mutation happens to a specific copy. Reference types are necessary when identity, sharing, inheritance, or Objective-C/UIKit interoperability matters.

**How it works:**  
Struct values are copied semantically when assigned or passed. The compiler can optimize many copies away. Classes live as heap-allocated instances managed by ARC; variables hold references to those instances. Multiple references can point to the same object.

**Use cases:**  
Use structs for models, configuration, view state, request/response DTOs, and small data containers. Use classes for UIKit objects, reference-owned services, delegates, caches, shared mutable coordinators, and objects that need `deinit`.

**Common mistakes:**  
Using a class for every model because other languages do. Assuming `let` makes a class immutable. Forgetting that two references can mutate the same object from different places.

**Best practices:**  
Default to `struct`; use `final class` when reference semantics are intentional. Keep mutable class state protected by actor isolation, main-actor isolation, or explicit synchronization.

**Red flag answers:**  
"Structs are always on the stack and classes are always on the heap." That is an oversimplification. The compiler decides storage details; the semantic distinction is value vs reference.

**Code example:**  
```swift
struct Profile {
    var name: String
}

final class Session {
    var token: String

    init(token: String) {
        self.token = token
    }
}

var a = Profile(name: "Ari")
var b = a
b.name = "Bo"
print(a.name) // Ari

let s1 = Session(token: "old")
let s2 = s1
s2.token = "new"
print(s1.token) // new
```

**Possible follow-up questions:**  
When would you still choose a class? How do copy-on-write collections fit this model? What does `let` mean for a class reference?

### [Beginner] What are value types and reference types?
**Interview answer:**  
Value types carry their own independent value. Reference types carry a reference to shared identity. In Swift, structs, enums, and tuples are value types; classes, actors, and closures are reference-like.

**Deep explanation:**  
Value semantics means code can treat a value as independent after assignment. Reference semantics means two variables can be aliases for the same underlying instance. Both are useful; the mistake is using one accidentally.

**Why it matters:**  
Most iOS bugs involving surprising state changes, stale UI, or data races come from unclear ownership and aliasing. Value types reduce accidental aliasing.

**How it works:**  
The language promises value behavior even when the implementation shares storage internally. `Array`, `Dictionary`, `Set`, and `String` use copy-on-write so copies are cheap until mutation.

**Use cases:**  
Value types for app state snapshots, SwiftUI view input, diffable data source items, and request models. Reference types for object identity, delegate lifetimes, and shared services.

**Common mistakes:**  
Believing value type means "deep copy of everything." A struct can contain a class reference, and then the struct copy still points to the same referenced object.

**Best practices:**  
Make value-type properties value types where possible. If a struct wraps a class, document that reference behavior or implement copy-on-write.

**Red flag answers:**  
"Reference types are bad." They are not; they are just higher-risk when shared mutation is uncontrolled.

**Code example:**  
```swift
final class Box {
    var count = 0
}

struct Wrapper {
    var box: Box
}

var first = Wrapper(box: Box())
var second = first
second.box.count = 10

print(first.box.count) // 10, because the wrapped class is shared
```

**Possible follow-up questions:**  
How do you design a value type that owns reference storage? How does this affect SwiftUI state?

### [Intermediate] Why does Swift favor value types?
**Interview answer:**  
Swift favors value types because they make code easier to reason about, reduce accidental shared mutation, compose well with generics and protocols, and support efficient copy-on-write implementations.

**Deep explanation:**  
Value types fit Swift's goals: safety, performance, and clarity. If assigning a value produces independent behavior, fewer parts of the app can unexpectedly mutate it. This helps architecture, testing, concurrency, and SwiftUI rendering.

**Why it matters:**  
SwiftUI is built around value descriptions of UI. App state is often represented as values and changes are propagated intentionally. Concurrency also benefits because immutable or value-semantic data is easier to move between tasks.

**How it works:**  
The compiler can place, copy, inline, and optimize values aggressively. Standard library collections avoid eager deep copies by sharing buffers until mutation. At the language level, behavior still appears as if a copy was made.

**Use cases:**  
Domain models, reducers, form state, immutable snapshots, configuration objects, and SwiftUI views.

**Common mistakes:**  
Turning every object into a struct even when identity matters. Large structs with many mutable reference properties can be harder to reason about than a small explicit class.

**Best practices:**  
Use value types for data and reference types for identity/lifetime. Keep values small enough conceptually, not necessarily physically. Do not optimize away structs prematurely.

**Red flag answers:**  
"Structs are always faster." Performance depends on size, copying behavior, ARC traffic, cache locality, and mutation pattern.

**Code example:**  
```swift
struct CheckoutState: Equatable {
    var items: [CartItem]
    var selectedPaymentID: Payment.ID?
    var isSubmitting = false
}

// A reducer-style update returns a new value snapshot.
func selectingPayment(_ id: Payment.ID, in state: CheckoutState) -> CheckoutState {
    var copy = state
    copy.selectedPaymentID = id
    return copy
}
```

**Possible follow-up questions:**  
How does value semantics help thread safety? When can a value type still be unsafe?

### [Intermediate] What is copy-on-write?
**Interview answer:**  
Copy-on-write is an optimization where values share storage until one copy is mutated. Swift collections like `Array`, `Dictionary`, `Set`, and `String` behave like values but avoid copying their full storage on every assignment.

**Deep explanation:**  
Without copy-on-write, copying large arrays on every assignment would be expensive. With COW, two arrays can point to the same buffer. When one is mutated, Swift checks whether the buffer is uniquely referenced; if not, it copies before mutation so value semantics are preserved.

**Why it matters:**  
It explains why value types can be both safe and performant. It also explains performance cliffs when repeatedly mutating shared copies.

**How it works:**  
The standard library stores collection elements in reference-backed buffers. Mutation checks uniqueness, conceptually using `isKnownUniquelyReferenced` for custom COW types. If storage is unique, mutate in place. If shared, allocate and copy first.

**Use cases:**  
Large collections, strings, images or buffers wrapped in value types, immutable snapshots with occasional mutation.

**Common mistakes:**  
Assuming COW makes all copies free forever. Mutating after copying can trigger real allocation and copying. Also, COW does not automatically make shared mutable reference contents safe.

**Best practices:**  
Avoid unnecessary intermediate copies in hot paths. For custom COW, keep storage private and ensure all mutations go through uniqueness checks.

**Red flag answers:**  
"Copy-on-write means Swift never copies arrays." It copies when needed to preserve independent value behavior.

**Code example:**  
```swift
final class Storage {
    var values: [Int]

    init(_ values: [Int]) {
        self.values = values
    }

    init(copying storage: Storage) {
        values = storage.values
    }
}

struct CowList {
    private var storage: Storage

    init(_ values: [Int]) {
        storage = Storage(values)
    }

    var values: [Int] { storage.values }

    mutating func append(_ value: Int) {
        if !isKnownUniquelyReferenced(&storage) {
            storage = Storage(copying: storage)
        }
        storage.values.append(value)
    }
}
```

**Possible follow-up questions:**  
How would you implement COW safely? What happens if the storage leaks outside the struct?

### [Beginner] What are optionals and why does Swift use them?
**Interview answer:**  
An optional represents either a wrapped value or `nil`. Swift uses optionals to make absence explicit in the type system so you handle missing values safely instead of crashing through null references.

**Deep explanation:**  
`String` and `String?` are different types. A `String?` must be unwrapped before use because the compiler does not know whether it contains a value. Optional unwrapping is a safety boundary: `if let`, `guard let`, optional chaining, nil coalescing, and pattern matching all express how absence should be handled.

**Why it matters:**  
Many iOS APIs naturally have absence: missing network fields, optional delegates, unavailable UI state, not-yet-loaded data, nullable Objective-C imports, and failed lookups.

**How it works:**  
`Optional<Wrapped>` is an enum with `.some(Wrapped)` and `.none`. The `?` syntax is sugar for `Optional`.

**Use cases:**  
Parsing JSON, looking up dictionary values, weak references, optional callbacks, navigation selection, and UI text fields that may not have valid input yet.

**Common mistakes:**  
Force-unwrapping because a value "should exist." Overusing optionals where a non-optional default or explicit state enum would be clearer.

**Best practices:**  
Use `guard let` for required early exits. Use optional chaining for genuinely optional work. Model meaningful states with enums instead of multiple loosely related optionals.

**Red flag answers:**  
"Optionals are just null." They are typed containers that force handling at compile time.

**Code example:**  
```swift
func displayName(from profile: Profile?) -> String {
    guard let profile else {
        return "Guest"
    }

    return profile.name.trimmingCharacters(in: .whitespacesAndNewlines)
}
```

**Possible follow-up questions:**  
What is implicitly unwrapped optional? When is `!` acceptable? How do optionals map from Objective-C nullability?

### [Intermediate] What is protocol-oriented programming?
**Interview answer:**  
Protocol-oriented programming designs behavior around protocols and protocol extensions instead of only class inheritance. It lets unrelated types share capabilities while preserving value semantics and static dispatch where possible.

**Deep explanation:**  
A protocol defines requirements. Types conform by implementing those requirements. Protocol extensions can provide default behavior, and generic constraints can activate behavior only for matching types. This gives reuse without forcing a common superclass.

**Why it matters:**  
iOS apps frequently need testable boundaries: repositories, analytics trackers, clocks, network clients, coordinators, and formatters. Protocols let production and test implementations share contracts without inheritance.

**How it works:**  
When a generic function is constrained to a protocol, the compiler often specializes it for concrete types. When a value is stored as `any Protocol`, Swift uses an existential container and dynamic dispatch through witness tables.

**Use cases:**  
Dependency injection, mocking, reusable UI configuration, collection algorithms, domain abstractions, and framework extension points.

**Common mistakes:**  
Creating a protocol for every class even when there is one implementation and no boundary. Putting too many unrelated requirements into one protocol.

**Best practices:**  
Prefer small role-based protocols. Define protocols at the consumer boundary when testability or substitution is needed. Avoid protocol requirements that expose implementation details.

**Red flag answers:**  
"POP means never use classes." Protocols and classes solve different problems.

**Code example:**  
```swift
protocol UserRepository {
    func user(id: User.ID) async throws -> User
}

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
What are protocol extensions? How do existentials differ from generics? What is a witness table?

### [Intermediate] What are generics and why are they useful?
**Interview answer:**  
Generics let you write reusable, type-safe code that works with many concrete types without losing static type information.

**Deep explanation:**  
Instead of writing the same container, algorithm, or wrapper for each type, you write it once with a type parameter. The compiler checks constraints at compile time and can specialize generic code for performance.

**Why it matters:**  
Swift's standard library is generic: `Array<Element>`, `Dictionary<Key, Value>`, `Result<Success, Failure>`, `Optional<Wrapped>`. In app code, generics help build reusable networking, storage, and view components without casting.

**How it works:**  
Generic placeholders stand in for concrete types. Constraints such as `T: Decodable` or `T: Identifiable` tell the compiler which operations are allowed.

**Use cases:**  
Network clients decoding arbitrary DTOs, reusable SwiftUI rows, typed caches, result wrappers, and collection helpers.

**Common mistakes:**  
Using generics where a concrete type is simpler. Exposing too many generic parameters in public APIs. Replacing clear domain types with abstract generic machinery.

**Best practices:**  
Use generics when the behavior is truly identical across types and type safety matters. Add constraints only as needed.

**Red flag answers:**  
"Generics are just `Any`." `Any` erases type information; generics preserve it.

**Code example:**  
```swift
struct APIClient {
    func get<Response: Decodable>(
        _ type: Response.Type,
        from url: URL
    ) async throws -> Response {
        let (data, response) = try await URLSession.shared.data(from: url)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode(Response.self, from: data)
    }
}
```

**Possible follow-up questions:**  
What is generic specialization? How do generic constraints differ from protocol existentials?

### [Senior] What are associated types in protocols?
**Interview answer:**  
An associated type is a placeholder type declared inside a protocol. The conforming type chooses the concrete associated type, letting the protocol express relationships between inputs, outputs, and stored values.

**Deep explanation:**  
Some protocols cannot be fully described without saying "this type has some related type." For example, `Sequence` has an `Element`. A repository might have an `Entity`. Associated types keep these relationships type-safe.

**Why it matters:**  
Associated types are common in SwiftUI, Combine, collections, repositories, and reusable architecture. They explain why some protocols cannot be used directly as simple existential types without `any` limitations or type erasure.

**How it works:**  
The conforming type either explicitly defines a `typealias` or the compiler infers the associated type from method signatures/properties. Generic constraints can refer to that associated type.

**Use cases:**  
Reusable data sources, parsers, repositories, sequences, reducers, and SwiftUI protocols.

**Common mistakes:**  
Trying to store `let repository: Repository` when `Repository` has associated types or `Self` requirements and expecting it to work like a Java interface. Use generics or type erasure instead.

**Best practices:**  
Use associated types when the relationship is part of the protocol's core meaning. If callers need heterogeneous storage, design a type-erased wrapper.

**Red flag answers:**  
"Associated types are generics for protocols" is a start, but incomplete. The key is that conforming types bind related types as part of conformance.

**Code example:**  
```swift
protocol Repository {
    associatedtype Entity: Identifiable
    func fetch(id: Entity.ID) async throws -> Entity
}

struct UserRepository: Repository {
    func fetch(id: User.ID) async throws -> User {
        User(id: id, name: "Ari")
    }
}
```

**Possible follow-up questions:**  
Why can protocols with associated types be hard to store? How would you type-erase this repository?

### [Beginner] What are extensions in Swift?
**Interview answer:**  
Extensions add functionality to an existing type, protocol, or generic specialization without modifying the original declaration.

**Deep explanation:**  
Extensions can add computed properties, methods, initializers, nested types, protocol conformance, and protocol default implementations. They cannot add stored instance properties to existing types.

**Why it matters:**  
Extensions help organize code by capability and keep files focused. They also make protocol-oriented programming powerful because behavior can be added conditionally.

**How it works:**  
The compiler treats extension members as part of the type's available interface, subject to access control and module boundaries. Conditional extensions apply only when constraints are satisfied.

**Use cases:**  
Organizing `// MARK:` sections, protocol conformance, test helpers, formatters, SwiftUI view modifiers, and collection utilities.

**Common mistakes:**  
Using extensions to scatter a type's core behavior across too many files. Adding broad extensions to standard types with ambiguous names.

**Best practices:**  
Keep extensions cohesive: one conformance or capability per extension. Prefer explicit names that do not conflict with future platform APIs.

**Red flag answers:**  
"Extensions are inheritance." They are static additions, not subclassing.

**Code example:**  
```swift
extension Collection where Element: Identifiable {
    func element(id: Element.ID) -> Element? {
        first { $0.id == id }
    }
}
```

**Possible follow-up questions:**  
Can extensions override methods? Can they add stored properties? What are conditional conformances?

### [Intermediate] How does Swift error handling work?
**Interview answer:**  
Swift uses typed throwing functions marked with `throws`. Callers use `try`, `try?`, or `try!`, and handle errors with `do/catch` or propagate them from another throwing function.

**Deep explanation:**  
Swift errors are values, typically enums conforming to `Error`. Throwing separates expected failure from impossible programmer mistakes. It avoids exceptions for ordinary control flow while keeping error paths explicit.

**Why it matters:**  
Networking, decoding, persistence, permissions, and file access all fail in normal app operation. Good error modeling helps UI show meaningful recovery, not just "Something went wrong."

**How it works:**  
A throwing function has an alternate exit path. `try` marks the call site where control flow can leave the current path. `try?` converts success to optional value and failure to `nil`.

**Use cases:**  
API clients, repositories, data migrations, image loading, Keychain access, and business validation.

**Common mistakes:**  
Catching and ignoring errors. Using `try!` for recoverable failures. Exposing raw low-level errors directly to user-facing UI.

**Best practices:**  
Model domain errors where useful. Preserve underlying errors for logging. Convert technical failures to user-friendly state at the presentation boundary.

**Red flag answers:**  
"Use `try?` everywhere to avoid crashes." That hides failure and makes debugging harder.

**Code example:**  
```swift
enum LoginError: LocalizedError {
    case invalidCredentials
    case networkUnavailable

    var errorDescription: String? {
        switch self {
        case .invalidCredentials:
            return "The email or password is incorrect."
        case .networkUnavailable:
            return "Check your connection and try again."
        }
    }
}

func login(email: String, password: String) async throws -> Session {
    guard !email.isEmpty, !password.isEmpty else {
        throw LoginError.invalidCredentials
    }
    // Network call...
    return Session(token: "token")
}
```

**Possible follow-up questions:**  
When would you use `Result` instead of `throws`? How do async and throwing compose?

### [Beginner] What is access control in Swift?
**Interview answer:**  
Access control limits where declarations can be used. Swift has `private`, `fileprivate`, `internal`, `package`, `public`, and `open`. `internal` is the default.

**Deep explanation:**  
Access control protects module boundaries and API design. `public` exposes a symbol outside the module, but `open` additionally allows subclassing and overriding outside the module. `package` is useful in Swift packages to share within a package but not expose publicly.

**Why it matters:**  
Good access control reduces accidental coupling. It makes refactoring easier and keeps app modules from depending on implementation details.

**How it works:**  
The compiler enforces access rules at compile time. A declaration cannot expose another declaration that is less visible than itself.

**Use cases:**  
Framework APIs, modular architecture, package internals, testable boundaries, and hiding implementation details.

**Common mistakes:**  
Marking everything `public`. Using `private` so aggressively that related extensions become awkward. Confusing `public` with `open`.

**Best practices:**  
Start with the most restrictive access that fits the use case. Make APIs public only when they are intentional contracts.

**Red flag answers:**  
"Private means private to the class." In Swift, `private` is scoped to the declaration and its extensions in the same file, while `fileprivate` is file-wide.

**Code example:**  
```swift
public struct UserProfile {
    public let id: UUID
    public private(set) var displayName: String

    public init(id: UUID, displayName: String) {
        self.id = id
        self.displayName = displayName
    }
}
```

**Possible follow-up questions:**  
What is the difference between `public` and `open`? How does access control affect testing?

### [Beginner] What is a mutating method?
**Interview answer:**  
A `mutating` method is a method on a struct or enum that can change `self` or its stored properties.

**Deep explanation:**  
Value types are immutable by default inside instance methods because methods receive `self` as immutable unless marked `mutating`. Marking a method `mutating` tells the compiler the method may replace or modify the value.

**Why it matters:**  
It makes mutation explicit. Callers must hold the value in a `var`, not a `let`, to call a mutating method.

**How it works:**  
For structs, mutation changes stored properties. For enums, mutation can replace `self` with another case.

**Use cases:**  
State updates, builders, domain model transitions, counters, and enum state machines.

**Common mistakes:**  
Forgetting `mutating` on value-type methods. Expecting a mutating method to work on a `let` value. Using classes just to avoid `mutating`.

**Best practices:**  
Use `mutating` for intentional state transitions. For complex state transitions, consider returning a new value if that reads better.

**Red flag answers:**  
"Mutating is only for structs." Enums can have mutating methods too.

**Code example:**  
```swift
struct RetryPolicy {
    private(set) var attempts = 0
    let maxAttempts: Int

    mutating func recordFailure() {
        attempts += 1
    }

    var canRetry: Bool {
        attempts < maxAttempts
    }
}
```

**Possible follow-up questions:**  
Why don't classes need `mutating`? How does `mutating` interact with protocol requirements?

### [Intermediate] What are closures and capture lists?
**Interview answer:**  
A closure is a block of executable code that can be passed around. It can capture values from its surrounding scope. A capture list controls how values are captured, commonly using `[weak self]`, `[unowned self]`, or `[value]`.

**Deep explanation:**  
Closures are reference types. If a closure uses a variable from outside, Swift keeps that value alive for the closure's lifetime. By default, object references captured by closures are strong, which can create retain cycles.

**Why it matters:**  
Closures are everywhere in iOS: animations, completion handlers, Combine, SwiftUI callbacks, tasks, and collection transformations. Capture behavior directly affects memory and correctness.

**How it works:**  
The compiler creates a closure object that stores captured values. Capturing a variable can capture a reference to mutable storage; using `[value]` captures the current value.

**Use cases:**  
Callbacks, sorting/filtering, dependency injection factories, delayed work, SwiftUI actions, and async task bodies.

**Common mistakes:**  
Using `[weak self]` mechanically everywhere. Capturing stale values accidentally. Creating cycles between `self`, a stored closure, and the closure body.

**Best practices:**  
Use `[weak self]` when `self` owns the closure or the closure may outlive `self`. Capture specific dependencies when possible.

**Red flag answers:**  
"Always use weak self in closures." This can drop needed work and hide lifecycle issues.

**Code example:**  
```swift
final class ImageLoader {
    var onComplete: ((UIImage) -> Void)?

    func start() {
        fetchImage { [weak self] image in
            guard let self else { return }
            self.onComplete?(image)
        }
    }

    private func fetchImage(completion: @escaping (UIImage) -> Void) {
        // Asynchronous work...
    }
}
```

**Possible follow-up questions:**  
When would you use `unowned`? What does `[value]` do? Are closures value types or reference types?

### [Intermediate] What is the difference between escaping and non-escaping closures?
**Interview answer:**  
A non-escaping closure must be called before the function returns. An escaping closure can outlive the function call, so it must be marked `@escaping`.

**Deep explanation:**  
Non-escaping closures are safer and easier for the compiler to optimize because their lifetime is bounded by the function call. Escaping closures are stored, dispatched later, or executed asynchronously.

**Why it matters:**  
Most async callbacks, stored handlers, and delayed work use escaping closures. Escaping closures can capture `self` strongly and create retain cycles.

**How it works:**  
Closure parameters are non-escaping by default. Marking `@escaping` changes lifetime rules and requires explicit `self` capture in many contexts.

**Use cases:**  
Non-escaping: `map`, `filter`, synchronous validation. Escaping: network completion handlers, animation completions, notification callbacks, stored SwiftUI actions.

**Common mistakes:**  
Adding `@escaping` because the compiler asks without understanding why. Storing non-escaping closures. Forgetting memory implications.

**Best practices:**  
Keep closures non-escaping by default. Use async/await instead of escaping completion handlers for new asynchronous APIs.

**Red flag answers:**  
"Escaping means it runs on another thread." It means lifetime escapes; threading is separate.

**Code example:**  
```swift
func validate(_ isValid: () -> Bool) -> Bool {
    isValid()
}

final class ButtonModel {
    private let action: () -> Void

    init(action: @escaping () -> Void) {
        self.action = action
    }

    func tap() {
        action()
    }
}
```

**Possible follow-up questions:**  
Why does escaping require explicit `self`? How does async/await change old completion-handler APIs?

### [Senior] What is the difference between `some` and `any`?
**Interview answer:**  
`some Protocol` is an opaque type: the concrete type is hidden from the caller but fixed by the implementation. `any Protocol` is an existential: it can hold any concrete conforming type at runtime.

**Deep explanation:**  
`some` preserves a single concrete type relationship while hiding the exact type. This enables static type checking and optimization. `any` erases the concrete type behind a protocol interface, enabling heterogeneous storage but losing some static type information.

**Why it matters:**  
SwiftUI uses `some View` because every `body` has one concrete generated type, even if it is ugly. Existentials are useful at architecture boundaries, but they have dispatch and capability limitations.

**How it works:**  
Opaque types are chosen by the function implementation and known to the compiler. Existentials store a value plus metadata/witness table information needed to call protocol requirements dynamically.

**Use cases:**  
Use `some` for returning hidden but stable concrete types, especially SwiftUI views. Use `any` for arrays of mixed conforming types, dependency properties, or plugin-like systems.

**Common mistakes:**  
Thinking `some View` means "any view." Returning different concrete types from different branches without `@ViewBuilder` or type erasure. Using `any` when generics would preserve stronger type information.

**Best practices:**  
Prefer generics or `some` when the concrete type relationship matters. Use `any` deliberately when runtime heterogeneity is required.

**Red flag answers:**  
"`some` and `any` are interchangeable." They solve opposite problems: hiding a fixed type vs storing variable conforming types.

**Code example:**  
```swift
protocol ShapeStyleProvider {
    associatedtype Style: ShapeStyle
    var style: Style { get }
}

func makeTitle() -> some View {
    Text("Profile")
        .font(.title)
}

let formatters: [any FormatStyle] = [
    Date.FormatStyle(date: .abbreviated, time: .omitted),
    IntegerFormatStyle<Int>()
]
```

**Possible follow-up questions:**  
Why does SwiftUI use `some View`? When do you need `AnyView`? What limitations do existentials have with associated types?

### [Senior] What is type erasure?
**Interview answer:**  
Type erasure hides a concrete generic or associated type behind a stable wrapper type. It is useful when you need to store or return values with different concrete types through one interface.

**Deep explanation:**  
Protocols with associated types and generic types preserve type information, but that can make storage and API boundaries difficult. Type erasure creates a concrete wrapper, such as `AnySequence`, `AnyPublisher`, or `AnyView`, that forwards behavior while hiding the underlying type.

**Why it matters:**  
It helps build architecture seams and heterogeneous collections, but it also removes compile-time knowledge and can hurt optimization or SwiftUI diffing.

**How it works:**  
A wrapper stores closures or a boxed base object that implements operations. Callers interact with the wrapper instead of the original generic type.

**Use cases:**  
Heterogeneous repositories, hiding Combine publisher chains, plugin systems, SwiftUI conditional storage, and public API stability.

**Common mistakes:**  
Erasing too early. Using `AnyView` to avoid understanding SwiftUI's type system. Losing useful constraints and performance.

**Best practices:**  
Keep concrete/generic types internally. Erase at module boundaries, storage boundaries, or where heterogeneity is truly needed.

**Red flag answers:**  
"Type erasure makes code simpler." It can make call sites simpler while making debugging and performance less transparent.

**Code example:**  
```swift
struct AnyRepository<Entity: Identifiable> {
    private let _fetch: (Entity.ID) async throws -> Entity

    init<R: Repository>(_ repository: R) where R.Entity == Entity {
        _fetch = repository.fetch
    }

    func fetch(id: Entity.ID) async throws -> Entity {
        try await _fetch(id)
    }
}
```

**Possible follow-up questions:**  
How does `AnyView` affect SwiftUI? How is type erasure different from `any Protocol`?

### [Senior] What are result builders?
**Interview answer:**  
Result builders transform a block of expressions into a single result. SwiftUI's `@ViewBuilder` lets you write multiple child views declaratively and have the compiler combine them into a concrete view type.

**Deep explanation:**  
Result builders are a compile-time DSL feature. They rewrite code like multiple expressions, `if`, `switch`, and limited loops into calls such as `buildBlock`, `buildEither`, and `buildOptional`.

**Why it matters:**  
They explain SwiftUI syntax. A `VStack { Text("A"); Text("B") }` is not magic syntax for arrays; it is builder-transformed code producing a strongly typed view tree.

**How it works:**  
The builder type defines static build methods. The compiler applies those methods to the statements in the annotated closure or property.

**Use cases:**  
SwiftUI views, HTML DSLs, layout builders, settings builders, and test-data builders.

**Common mistakes:**  
Expecting arbitrary imperative code inside a builder. Confusing the builder's declarative output with runtime rendering.

**Best practices:**  
Use builders for declarative composition, not complex business logic. Extract complex conditions into computed properties or helper methods.

**Red flag answers:**  
"ViewBuilder returns an array of views." It returns a concrete composed type such as tuples, conditionals, or specialized SwiftUI container types.

**Code example:**  
```swift
@ViewBuilder
func statusView(isOnline: Bool) -> some View {
    if isOnline {
        Label("Online", systemImage: "checkmark.circle")
    } else {
        Label("Offline", systemImage: "xmark.circle")
    }
}
```

**Possible follow-up questions:**  
Why can different branches compile inside `@ViewBuilder`? What are builder limitations?
